CREATE OR REPLACE FUNCTION public.get_contact_auth_info(p_client_id text)
RETURNS TABLE(email text, last_sign_in_at timestamptz, invite_sent_at timestamptz, invite_expires_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 
    u.email::text,
    u.last_sign_in_at,
    ur.invite_sent_at,
    ur.invite_expires_at
  FROM auth.users u
  INNER JOIN client_contacts cc ON cc.email = u.email
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  WHERE cc.client_id = p_client_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_contact_auth_info(text) TO authenticated;