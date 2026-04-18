-- Update get_invite_records to also return last_sign_in_at from auth.users
DROP FUNCTION IF EXISTS public.get_invite_records();

CREATE OR REPLACE FUNCTION public.get_invite_records()
 RETURNS TABLE(
   id uuid,
   user_id uuid,
   client_id text,
   role text,
   invite_status text,
   invite_sent_at timestamp with time zone,
   invite_expires_at timestamp with time zone,
   email text,
   last_sign_in_at timestamp with time zone
 )
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    ur.id,
    ur.user_id,
    ur.client_id,
    ur.role,
    ur.invite_status,
    ur.invite_sent_at,
    ur.invite_expires_at,
    au.email,
    au.last_sign_in_at
  FROM user_roles ur
  LEFT JOIN auth.users au ON au.id = ur.user_id
  WHERE public.has_role(auth.uid(), 'admin');
$function$;