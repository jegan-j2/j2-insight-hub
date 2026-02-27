-- Allow admins to insert sql_meetings (needed for reschedule feature)
CREATE POLICY "Admins can insert meetings"
ON public.sql_meetings
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'admin'
));

-- Allow managers to insert sql_meetings
CREATE POLICY "Managers can insert meetings"
ON public.sql_meetings
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.role = 'manager'
));

-- Allow clients to insert meetings for their own client_id
CREATE POLICY "Clients can insert own meetings"
ON public.sql_meetings
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid()
  AND user_roles.client_id = sql_meetings.client_id
));