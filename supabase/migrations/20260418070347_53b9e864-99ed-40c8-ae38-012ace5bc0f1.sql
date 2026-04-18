CREATE OR REPLACE FUNCTION public.revoke_client_access(p_email text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.user_roles
  WHERE user_id = (
    SELECT id FROM auth.users WHERE email = p_email
  );
$$;

GRANT EXECUTE ON FUNCTION public.revoke_client_access(text) TO authenticated;