
-- Add profile_photo_url to team_members
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS profile_photo_url text;

-- Create client-assets storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('client-assets', 'client-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Create team-photos storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('team-photos', 'team-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-assets
CREATE POLICY "Public read client assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-assets');

CREATE POLICY "Admins upload client assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins update client assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'client-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins delete client assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-assets'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);

-- Storage policies for team-photos
CREATE POLICY "Public read team photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'team-photos');

CREATE POLICY "Admins upload team photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'team-photos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins update team photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'team-photos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Admins delete team photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'team-photos'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
  )
);
