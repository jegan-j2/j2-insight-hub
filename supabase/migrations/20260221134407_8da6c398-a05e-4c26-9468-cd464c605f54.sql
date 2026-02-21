-- Fix: Restrict branding bucket write access to admins only
DROP POLICY IF EXISTS "Authenticated users can upload branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete branding" ON storage.objects;

CREATE POLICY "Admins upload branding" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'branding' AND EXISTS (
  SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
));

CREATE POLICY "Admins update branding" ON storage.objects FOR UPDATE
USING (bucket_id = 'branding' AND EXISTS (
  SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
));

CREATE POLICY "Admins delete branding" ON storage.objects FOR DELETE
USING (bucket_id = 'branding' AND EXISTS (
  SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
));