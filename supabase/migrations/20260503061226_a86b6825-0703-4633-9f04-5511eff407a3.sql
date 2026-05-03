-- 1. Harden user_roles to prevent privilege escalation
-- Restrict SELECT policies to authenticated only (currently allow public role)
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Add a RESTRICTIVE policy ensuring only admins (or service role) can insert/update/delete
-- This stacks AND with permissive policies, blocking any path that lets non-admins self-grant
CREATE POLICY "Block non-admin role mutations"
  ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Add SET search_path to functions missing it (mutable search_path warning)
ALTER FUNCTION public.get_sdr_hourly_breakdown(text, date, text) SET search_path = public;
ALTER FUNCTION public.get_weekly_pace(text, date, date, integer) SET search_path = public;
ALTER FUNCTION public.get_sdr_demos(text, text, date, date) SET search_path = public;
ALTER FUNCTION public.get_demo_heatmap_counts(text, date, date) SET search_path = public;
ALTER FUNCTION public.get_sdr_demo_counts(date, date, text) SET search_path = public;
ALTER FUNCTION public.get_client_demo_counts(text, date, date) SET search_path = public;

-- 3. Revoke anon EXECUTE on SECURITY DEFINER functions (public callable warning)
REVOKE EXECUTE ON FUNCTION public.get_team_heatmap(text, date, date, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_invite_records() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_contact_auth_info(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_client_access(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.revoke_user_access(text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_user_role(text, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, text) FROM anon;

-- 4. Database-level input validation constraints (defense in depth)
ALTER TABLE public.clients
  ADD CONSTRAINT clients_name_length_chk CHECK (char_length(client_name) BETWEEN 1 AND 100),
  ADD CONSTRAINT clients_email_format_chk CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ADD CONSTRAINT clients_email_length_chk CHECK (email IS NULL OR char_length(email) <= 255),
  ADD CONSTRAINT clients_campaign_date_order_chk CHECK (campaign_end IS NULL OR campaign_start IS NULL OR campaign_end >= campaign_start);

ALTER TABLE public.team_members
  ADD CONSTRAINT team_members_name_length_chk CHECK (char_length(sdr_name) BETWEEN 1 AND 100),
  ADD CONSTRAINT team_members_email_format_chk CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ADD CONSTRAINT team_members_email_length_chk CHECK (char_length(email) <= 255),
  ADD CONSTRAINT team_members_role_length_chk CHECK (role IS NULL OR char_length(role) <= 50);