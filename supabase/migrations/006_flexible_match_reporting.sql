-- =============================================
-- MIGRATION 006: Power Points System
-- =============================================
-- Updates match reporting with Power Points (PP) system
-- Only the losing clan can report matches (enforced by RLS)

-- 1. Ensure the correct policy exists for match reporting (losers only)
DROP POLICY IF EXISTS "Clan members can report losses" ON matches;
DROP POLICY IF EXISTS "Clan members can report matches" ON matches;

CREATE POLICY "Clan members can report losses"
ON matches FOR INSERT
TO authenticated
WITH CHECK (
    -- User must be a member of the LOSING clan
    EXISTS (
        SELECT 1 FROM clan_members
        WHERE user_id = auth.uid()
        AND clan_id = loser_clan_id
    )
);

-- 2. Update match_participants policy
DROP POLICY IF EXISTS "Clan members can record match participation" ON match_participants;

CREATE POLICY "Match reporters can record participation"
ON match_participants FOR INSERT
TO authenticated
WITH CHECK (
    -- Allow inserting participants if user is the match reporter
    EXISTS (
        SELECT 1 FROM matches m
        WHERE m.id = match_id
        AND m.reported_by = auth.uid()
    )
);
