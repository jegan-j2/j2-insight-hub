
-- Create security definer function to safely check roles without recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Drop self-referencing policies on user_roles to prevent infinite recursion
DROP POLICY IF EXISTS "Admin can delete user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can update user roles" ON public.user_roles;

-- Recreate using security definer function (no recursion)
CREATE POLICY "Admin can delete user roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert user roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update user roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin SELECT policy (admins need to see all roles for user management in Settings)
CREATE POLICY "Admin can read all user roles" ON public.user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
