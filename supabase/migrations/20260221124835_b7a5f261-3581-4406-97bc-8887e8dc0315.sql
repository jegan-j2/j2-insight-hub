
-- Fix 1: Add RLS policies for hubspot_lists (has RLS enabled but no policies)
CREATE POLICY "Admins see all hubspot_lists"
ON public.hubspot_lists
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Clients see own hubspot_lists"
ON public.hubspot_lists
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.client_id = hubspot_lists.client_id));

CREATE POLICY "Admins can insert hubspot_lists"
ON public.hubspot_lists
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can update hubspot_lists"
ON public.hubspot_lists
FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

CREATE POLICY "Admins can delete hubspot_lists"
ON public.hubspot_lists
FOR DELETE
TO authenticated
USING (EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'));

-- Fix 2: Remove overly permissive realtime policy on sql_meetings
DROP POLICY IF EXISTS "Enable realtime for sql_meetings" ON public.sql_meetings;
