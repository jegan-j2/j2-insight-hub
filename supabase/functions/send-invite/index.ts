import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const userId = claimsData.claims.sub

    // Verify admin role
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: roleData } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single()

    if (!roleData || roleData.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), { status: 403, headers: corsHeaders })
    }

    const { email, role, name, clientId } = await req.json()

    if (!email || !role) {
      return new Response(JSON.stringify({ error: 'Email and role are required' }), { status: 400, headers: corsHeaders })
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (typeof email !== 'string' || !emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: 'Invalid email format' }), { status: 400, headers: corsHeaders })
    }

    // Role whitelist
    const allowedRoles = ['admin', 'manager', 'client']
    if (!allowedRoles.includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid role' }), { status: 400, headers: corsHeaders })
    }

    // Length limits
    if (email.length > 255 || (name && typeof name === 'string' && name.length > 255)) {
      return new Response(JSON.stringify({ error: 'Input too long' }), { status: 400, headers: corsHeaders })
    }

    // Generate invite token
    const inviteToken = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days

    // Check if invite already exists for this client_id + role combo
    let existingQuery = adminClient
      .from('user_roles')
      .select('id')
      .eq('role', role)
      .is('user_id', null) // Not yet accepted

    if (clientId) {
      existingQuery = existingQuery.eq('client_id', clientId)
    }

    const { data: existing } = await existingQuery

    if (existing && existing.length > 0) {
      // Update existing invite
      await adminClient
        .from('user_roles')
        .update({
          invite_token: inviteToken,
          invite_status: 'pending',
          invite_sent_at: new Date().toISOString(),
          invite_expires_at: expiresAt,
        })
        .eq('id', existing[0].id)
    } else {
      // Create new invite record
      await adminClient
        .from('user_roles')
        .insert({
          role,
          client_id: clientId || null,
          invite_token: inviteToken,
          invite_status: 'pending',
          invite_sent_at: new Date().toISOString(),
          invite_expires_at: expiresAt,
        })
    }

    // TODO: Send actual email with invite link
    // For now, just log the invite details
    console.log(`Invite sent to ${email} for role ${role}, token: ${inviteToken}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invite sent to ${email}`,
        inviteToken // Return for debugging; remove in production
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending invite:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})
