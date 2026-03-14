import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate the caller
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role client for data access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify caller is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin role required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get notification settings
    const { data: settings } = await supabase
      .from('notification_settings')
      .select('*')
      .limit(1)
      .maybeSingle()

    if (!settings) {
      return new Response(JSON.stringify({ error: 'No notification settings configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const reportEmails = settings.report_emails
    if (!reportEmails) {
      return new Response(JSON.stringify({ error: 'No report email addresses configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get yesterday's date in Melbourne timezone
    const now = new Date()
    const melbourneDate = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Melbourne' }))
    melbourneDate.setDate(melbourneDate.getDate() - 1)
    const reportDate = melbourneDate.toISOString().split('T')[0]

    // Fetch daily snapshot data
    const { data: snapshots } = await supabase
      .from('daily_snapshots')
      .select('*')
      .eq('snapshot_date', reportDate)

    const totalDials = snapshots?.reduce((sum, s) => sum + (s.dials || 0), 0) || 0
    const totalAnswered = snapshots?.reduce((sum, s) => sum + (s.answered || 0), 0) || 0
    const totalDMs = snapshots?.reduce((sum, s) => sum + (s.dms_reached || 0), 0) || 0
    const totalSQLs = snapshots?.reduce((sum, s) => sum + (s.sqls || 0), 0) || 0
    const answerRate = totalDials > 0 ? ((totalAnswered / totalDials) * 100).toFixed(1) : '0.0'
    const conversionRate = totalDials > 0 ? ((totalSQLs / totalDials) * 100).toFixed(2) : '0.00'

    // Find top SDR
    let topSDR = 'N/A'
    if (snapshots && snapshots.length > 0) {
      const sorted = [...snapshots].sort((a, b) => (b.sqls || 0) - (a.sqls || 0))
      if (sorted[0]?.sqls && sorted[0].sqls > 0) {
        topSDR = `${sorted[0].sdr_name || 'Unknown'} (${sorted[0].sqls} SQLs)`
      }
    }

    const emailBody = `
Daily Performance Summary — ${reportDate}

📞 Total Dials: ${totalDials.toLocaleString()}
✅ Answered: ${totalAnswered.toLocaleString()} (${answerRate}%)
🤝 DM Conversations: ${totalDMs}
🎯 SQLs Booked: ${totalSQLs}
📈 Conversion Rate: ${conversionRate}%
🏆 Top SDR: ${topSDR}
    `.trim()

    // Send via Slack if webhook is configured
    if (settings.slack_webhook_url) {
      const content = (settings.report_content as Record<string, boolean>) || {}
      if (content.dailyReport !== false) {
        await fetch(settings.slack_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: `📊 *${emailBody.replace(/\n/g, '*\n*')}*` }),
        })
      }
    }

    // Send email via Resend if API key is available
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (resendKey) {
      const emailAddresses = reportEmails.split(',').map((e: string) => e.trim()).filter(Boolean)
      
      for (const to of emailAddresses) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: 'J2 Insight Hub <reports@updates.j2outsourcing.com>',
            to,
            subject: `Daily Performance Report — ${reportDate}`,
            text: emailBody,
          }),
        })
      }
    }

    return new Response(JSON.stringify({ success: true, date: reportDate }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
