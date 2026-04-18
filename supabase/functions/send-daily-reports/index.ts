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

    // DM Conversations: query activity_log directly (dms_reached field doesn't exist)
    const { data: dmData } = await supabase
      .from('activity_log')
      .select('id')
      .eq('is_decision_maker', true)
      .gte('activity_date', `${reportDate}T00:00:00+10:00`)
      .lte('activity_date', `${reportDate}T23:59:59+10:00`)

    const totalDMs = dmData?.length || 0
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

    const emailHtml = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #f8fafc; padding: 40px; margin: 0;">
  <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="background: #0F172A; padding: 32px; text-align: center;">
      <img src="https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_lightmode.png" width="72" style="display:block; margin: 0 auto 16px; border-radius: 50%;" />
      <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600;">Daily Performance Summary</h1>
      <p style="color: #94a3b8; margin: 6px 0 0; font-size: 14px;">${reportDate}</p>
    </div>
    <div style="padding: 32px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 15px;">📞 Total Dials</td><td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-size: 15px; font-weight: 600;">${totalDials.toLocaleString()}</td></tr>
        <tr><td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 15px;">✅ Answered</td><td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-size: 15px; font-weight: 600;">${totalAnswered.toLocaleString()} (${answerRate}%)</td></tr>
        <tr><td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 15px;">🤝 DM Conversations</td><td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-size: 15px; font-weight: 600;">${totalDMs.toLocaleString()}</td></tr>
        <tr><td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 15px;">🎯 SQLs Booked</td><td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-size: 15px; font-weight: 600;">${totalSQLs.toLocaleString()}</td></tr>
        <tr><td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 15px;">📈 Conversion Rate</td><td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-size: 15px; font-weight: 600;">${conversionRate}%</td></tr>
        <tr><td style="padding: 12px 0; color: #0f172a; font-size: 15px;">🏆 Top SDR</td><td style="padding: 12px 0; text-align: right; color: #0f172a; font-size: 15px; font-weight: 600;">${topSDR}</td></tr>
      </table>
    </div>
    <div style="background: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #94a3b8; font-size: 12px; margin: 0;">© 2026 J2 Group · Melbourne, Australia</p>
    </div>
  </div>
</body>
</html>`.trim()

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
            from: 'J2 Insight Hub <admin-support@j2group.com.au>',
            to,
            subject: `Daily Performance Report — ${reportDate}`,
            html: emailHtml,
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
