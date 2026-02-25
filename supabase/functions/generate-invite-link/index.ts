import { createClient } from 'npm:@supabase/supabase-js@2.49.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const buildEmailHtml = (inviteLink: string) => `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #f8fafc; padding: 40px;">
  <div style="max-width: 500px; margin: 0 auto; background: white; 
       border-radius: 12px; padding: 40px; 
       box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <img src="https://eaeqkgjhgdykxwjkaxpj.supabase.co/storage/v1/object/public/branding/j2_logo_new_lightmode.png" 
         width="80" style="display:block; margin: 0 auto 24px;" />
    <h2 style="text-align:center; color:#0f172a; margin-bottom:8px;">
      Welcome to J2 Insight Hub
    </h2>
    <p style="color:#64748b; text-align:center; margin-bottom:32px;">
      You've been invited to access the J2 Group Lead Generation Dashboard.
    </p>
    <a href="${inviteLink}" 
       style="display:block; background:#3b82f6; color:white; text-align:center;
              padding:14px; border-radius:8px; text-decoration:none; 
              font-weight:600; font-size:15px;">
      Accept Invitation
    </a>
    <p style="color:#94a3b8; font-size:12px; text-align:center; margin-top:24px;">
      This link expires in 48 hours. If you didn't expect this email, ignore it.
    </p>
    <hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />
    <p style="color:#94a3b8; font-size:12px; text-align:center;">
      © 2026 J2 Group · Melbourne, Australia
    </p>
  </div>
</body>
</html>`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

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
      options: { 
        redirectTo: `${Deno.env.get('APP_URL')}/reset-password`
      },
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
        subject: "You've been invited to J2 Insight Hub",
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

    // STEP 3: Update user_roles to track the invite
    console.log('Email sent successfully to:', email, '— updating user_roles...')

    try {
      const { data: usersData } = await adminClient.auth.admin.listUsers()
      const userId = usersData?.users?.find(
        (u: any) => u.email === email
      )?.id

      if (userId) {
        const { error: updateError } = await adminClient
          .from('user_roles')
          .update({
            invite_status: 'pending',
            invite_sent_at: new Date().toISOString(),
            invite_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          })
          .eq('user_id', userId)

        if (updateError) {
          console.warn('user_roles update failed (non-blocking):', updateError.message)
        } else {
          console.log('user_roles updated for user:', userId)
        }
      } else {
        console.warn('No auth user found for email, skipping user_roles update')
      }
    } catch (trackErr) {
      console.warn('Invite tracking error (non-blocking):', trackErr)
    }

    // STEP 4: Return success
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
