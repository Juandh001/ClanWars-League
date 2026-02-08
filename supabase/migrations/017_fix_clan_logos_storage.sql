-- =============================================
-- MIGRATION 017: Fix Clan Logos Storage
-- =============================================
-- Ensures clan-logos bucket exists and has correct policies

-- 1. Ensure storage bucket exists with correct settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'clan-logos',
    'clan-logos',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2. Drop existing policies to recreate them
DROP POLICY IF EXISTS "Captains can upload clan logo" ON storage.objects;
DROP POLICY IF EXISTS "Captains can update clan logo" ON storage.objects;
DROP POLICY IF EXISTS "Captains can delete clan logo" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload clan logo" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update clan logo" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete clan logo" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view clan logos" ON storage.objects;

-- 3. Recreate storage policies for clan-logos bucket

-- Allow clan captains to upload their clan logo
CREATE POLICY "Captains can upload clan logo"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'clan-logos' AND
    EXISTS (
        SELECT 1 FROM clans
        WHERE clans.id::text = (storage.foldername(name))[1]
        AND clans.captain_id = auth.uid()
    )
);

-- Allow clan captains to update their clan logo (for upsert)
CREATE POLICY "Captains can update clan logo"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'clan-logos' AND
    EXISTS (
        SELECT 1 FROM clans
        WHERE clans.id::text = (storage.foldername(name))[1]
        AND clans.captain_id = auth.uid()
    )
);

-- Allow clan captains to delete their clan logo
CREATE POLICY "Captains can delete clan logo"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'clan-logos' AND
    EXISTS (
        SELECT 1 FROM clans
        WHERE clans.id::text = (storage.foldername(name))[1]
        AND clans.captain_id = auth.uid()
    )
);

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

-- Allow public read access to clan logos
CREATE POLICY "Anyone can view clan logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'clan-logos');
