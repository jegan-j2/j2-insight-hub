CREATE OR REPLACE FUNCTION public.get_invite_records()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  client_id text,
  role text,
  invite_status text,
  invite_sent_at timestamptz,
  invite_expires_at timestamptz,
  email text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    ur.id,
    ur.user_id,
    ur.client_id,
    ur.role,
    ur.invite_status,
    ur.invite_sent_at,
    ur.invite_expires_at,
    au.email
  FROM user_roles ur
  LEFT JOIN auth.users au ON au.id = ur.user_id;
$$;