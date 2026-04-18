-- 1. Lock down revoke_client_access and revoke_user_access to admins only
CREATE OR REPLACE FUNCTION public.revoke_client_access(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  DELETE FROM public.user_roles
  WHERE user_id = (
    SELECT id FROM auth.users WHERE email = p_email
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_user_access(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
  END IF;
END;
$$;

-- 2. Lock down sync_user_role to admins only (also a SECURITY DEFINER role-modifying RPC)
CREATE OR REPLACE FUNCTION public.sync_user_role(p_email text, p_role text, p_client_id text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: admin access required';
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
  
  IF v_user_id IS NOT NULL THEN
    IF p_role = 'inactive' OR p_role = 'client_inactive' THEN
      DELETE FROM user_roles WHERE user_id = v_user_id;
    ELSE
      INSERT INTO user_roles (user_id, role, client_id)
      VALUES (
        v_user_id, 
        p_role,
        CASE 
          WHEN p_role = 'admin' THEN 'admin'
          WHEN p_role = 'manager' THEN NULL
          ELSE p_client_id
        END
      )
      ON CONFLICT (user_id) DO UPDATE SET
        role = EXCLUDED.role,
        client_id = EXCLUDED.client_id;
    END IF;
  END IF;
END;
$$;

-- 3. Fix user_roles policies — remove conflicting self-update policies that allowed privilege escalation
DROP POLICY IF EXISTS "Users can accept own invite" ON public.user_roles;
DROP POLICY IF EXISTS "Users cannot modify own role" ON public.user_roles;

-- Users can no longer update their own user_roles row at all. Only admins (existing policy) and service_role can.
-- Invite acceptance is handled server-side via edge functions using service_role.

-- 4. Add manager SELECT policy on sdr_alert_log
CREATE POLICY "Managers can read alert log"
ON public.sdr_alert_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'manager'));