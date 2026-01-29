-- =============================================
-- MIGRATION 004: Profile Editing (Nickname + Avatar)
-- =============================================

-- 1. Add nickname_changed_at column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS nickname_changed_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create storage bucket for avatars (run this in Supabase Dashboard > Storage)
-- Note: This SQL creates the bucket, but you may need to configure it in the dashboard
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies for avatars bucket

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access to avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 4. Function to check if nickname can be changed (30 day cooldown)
CREATE OR REPLACE FUNCTION can_change_nickname(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    last_change TIMESTAMPTZ;
BEGIN
    SELECT nickname_changed_at INTO last_change
    FROM profiles
    WHERE id = user_id;

    -- If never changed, allow it
    IF last_change IS NULL THEN
        RETURN true;
    END IF;

    -- Check if 30 days have passed
    RETURN (NOW() - last_change) > INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Function to get days until nickname can be changed
CREATE OR REPLACE FUNCTION days_until_nickname_change(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    last_change TIMESTAMPTZ;
    days_remaining INTEGER;
BEGIN
    SELECT nickname_changed_at INTO last_change
    FROM profiles
    WHERE id = user_id;

    -- If never changed, return 0 (can change now)
    IF last_change IS NULL THEN
        RETURN 0;
    END IF;

    -- Calculate remaining days
    days_remaining := 30 - EXTRACT(DAY FROM (NOW() - last_change))::INTEGER;

    IF days_remaining < 0 THEN
        RETURN 0;
    END IF;

    RETURN days_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger to update nickname_changed_at when nickname changes
CREATE OR REPLACE FUNCTION update_nickname_changed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.nickname IS DISTINCT FROM NEW.nickname THEN
        NEW.nickname_changed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_nickname_changed_at ON profiles;
CREATE TRIGGER trigger_update_nickname_changed_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_nickname_changed_at();
