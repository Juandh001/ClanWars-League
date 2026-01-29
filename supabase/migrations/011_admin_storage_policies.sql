-- =============================================
-- MIGRATION 011: Admin Storage Policies
-- =============================================
-- Allows admins to upload/update/delete clan logos

-- Allow admins to upload clan logos
CREATE POLICY "Admins can upload clan logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'clan-logos' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Allow admins to update clan logos
CREATE POLICY "Admins can update clan logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'clan-logos' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Allow admins to delete clan logos
CREATE POLICY "Admins can delete clan logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'clan-logos' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);
