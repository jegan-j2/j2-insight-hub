import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const buildEmailHtml = (actionLink: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:#0f172a;padding:32px;text-align:center;">
          <img src="https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/logos/j2-logo-light.png" alt="J2 Group" style="width:64px;height:64px;border-radius:50%;border:3px solid #ffffff;margin:0 auto 12px;display:block;" />
          <h1 style="color:#ffffff;font-size:20px;font-weight:700;margin:0;">J2 Insight Hub</h1>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="color:#0f172a;font-size:22px;font-weight:700;margin:0 0 16px;">Welcome</h2>
          <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px;">Use the button below to sign in to your J2 Insight Hub dashboard.</p>
          <table cellpadding="0" cellspacing="0" width="100%"><tr><td align="center">
            <a href="${actionLink}" style="display:inline-block;padding:14px 32px;background:#0f172a;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">Sign In to Dashboard</a>
          </td></tr></table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:20px 32px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="color:#94a3b8;font-size:12px;margin:0;">&copy; 2026 J2 Group &middot; Melbourne, Australia</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, redirectTo } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // STEP 1: Generate magic link silently (no Supabase email sent)
    console.log('Generating magic link for:', email)

    const { data, error } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: redirectTo || undefined },
    })

    if (error) {
      console.error('generateLink error:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const actionLink = data?.properties?.action_link
    if (!actionLink) {
      console.error('No action link generated')
      return new Response(
        JSON.stringify({ error: 'Failed to generate link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Action link generated, sending via Resend...')

    // STEP 2: Send exclusively via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'J2 Group <admin-support@j2group.com.au>',
        to: [email],
        subject: 'Your J2 Insight Hub Login Link',
        html: buildEmailHtml(actionLink),
      }),
    })

    const resendData = await resendRes.json()
    console.log('Resend response:', JSON.stringify(resendData))

    if (!resendRes.ok) {
      console.error('Resend failed:', resendData)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: resendData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // STEP 3: Return success
    console.log('Email sent successfully to:', email)
    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in generate-invite-link:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
