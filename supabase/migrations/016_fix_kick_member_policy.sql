-- =============================================
-- MIGRATION 016: Fix Kick Member Policy
-- =============================================
-- Allows captains and admins to delete clan members

-- Drop existing policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS view_clan_members ON clan_members;
DROP POLICY IF EXISTS add_clan_members ON clan_members;
DROP POLICY IF EXISTS update_clan_members ON clan_members;
DROP POLICY IF EXISTS delete_clan_members ON clan_members;

-- CREATE NEW POLICIES

-- SELECT: Everyone can view clan members
CREATE POLICY view_clan_members
ON clan_members
FOR SELECT
USING (true);

-- INSERT: Captains can add members
CREATE POLICY add_clan_members
ON clan_members
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM clans
    WHERE id = clan_id
    AND captain_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- UPDATE: Captains and admins can update member roles
CREATE POLICY update_clan_members
ON clan_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM clans
    WHERE id = clan_id
    AND captain_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- DELETE: Captains can kick members, members can leave, admins can remove anyone
CREATE POLICY delete_clan_members
ON clan_members
FOR DELETE
USING (
  -- Captain can kick others (but not themselves)
  (
    EXISTS (
      SELECT 1 FROM clans
      WHERE id = clan_id
      AND captain_id = auth.uid()
    )
    AND user_id != auth.uid()
  )
  -- OR user can leave themselves
  OR user_id = auth.uid()
  -- OR admin can remove anyone
  OR EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);
