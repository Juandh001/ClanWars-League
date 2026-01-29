-- =============================================
-- MIGRATION 005: Clan Logos and Editing
-- =============================================

-- 1. Add logo_url column to clans
ALTER TABLE clans
ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;

-- 2. Create storage bucket for clan logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'clan-logos',
    'clan-logos',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies for clan-logos bucket

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

-- Allow clan captains to update their clan logo
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

-- Allow public read access to clan logos
CREATE POLICY "Anyone can view clan logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'clan-logos');

-- 4. Update RLS policy to allow captains to update their clan's name, description, and logo
DROP POLICY IF EXISTS "Captains can update their clan" ON clans;
CREATE POLICY "Captains can update their clan"
ON clans FOR UPDATE
TO authenticated
USING (captain_id = auth.uid())
WITH CHECK (captain_id = auth.uid());
