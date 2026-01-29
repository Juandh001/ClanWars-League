-- =============================================
-- MIGRATION 003: In-App Invitation System
-- =============================================

-- 1. Add user_id column to clan_invitations (target user)
ALTER TABLE clan_invitations
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Create index for user_id
CREATE INDEX IF NOT EXISTS idx_clan_invitations_user ON clan_invitations(user_id);

-- 3. Update RLS policies for clan_invitations

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own invitations" ON clan_invitations;
DROP POLICY IF EXISTS "Clan captains can create invitations" ON clan_invitations;
DROP POLICY IF EXISTS "Users can update their own invitations" ON clan_invitations;

-- Users can view invitations sent to them (by user_id)
CREATE POLICY "Users can view their own invitations"
    ON clan_invitations FOR SELECT
    USING (
        user_id = auth.uid() OR
        email = (SELECT email FROM profiles WHERE id = auth.uid())
    );

-- Clan captains can create invitations
CREATE POLICY "Clan captains can create invitations"
    ON clan_invitations FOR INSERT
    WITH CHECK (
        invited_by = auth.uid() AND
        EXISTS (
            SELECT 1 FROM clans
            WHERE clans.id = clan_invitations.clan_id
            AND clans.captain_id = auth.uid()
        )
    );

-- Users can update (accept/decline) their own invitations
CREATE POLICY "Users can update their own invitations"
    ON clan_invitations FOR UPDATE
    USING (
        user_id = auth.uid() OR
        email = (SELECT email FROM profiles WHERE id = auth.uid())
    );

-- 4. Function to get user by nickname (case insensitive)
CREATE OR REPLACE FUNCTION find_user_by_nickname(search_nickname TEXT)
RETURNS TABLE (
    id UUID,
    nickname TEXT,
    email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.nickname, p.email
    FROM profiles p
    WHERE LOWER(p.nickname) = LOWER(search_nickname)
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Add invited_user relation for easier querying
-- This allows us to get the inviter's profile info
COMMENT ON COLUMN clan_invitations.user_id IS 'The target user ID who receives the invitation';
COMMENT ON COLUMN clan_invitations.invited_by IS 'The user ID who sent the invitation (clan captain)';
