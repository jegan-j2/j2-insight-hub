
-- Create branding storage bucket (publicly accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to branding bucket
CREATE POLICY "Authenticated users can upload branding"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'branding' AND auth.role() = 'authenticated');

-- Allow authenticated users to update branding files
CREATE POLICY "Authenticated users can update branding"
ON storage.objects FOR UPDATE
USING (bucket_id = 'branding' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete branding files
CREATE POLICY "Authenticated users can delete branding"
ON storage.objects FOR DELETE
USING (bucket_id = 'branding' AND auth.role() = 'authenticated');

-- Allow public read access to branding files
CREATE POLICY "Public read access to branding"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');
