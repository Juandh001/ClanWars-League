-- =============================================
-- MIGRATION 014: Fix Clan Creation RLS Policy
-- =============================================
-- Ensures users can create clans only if they have a valid profile

-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can create clans" ON clans;

-- Create improved policy that verifies profile exists
CREATE POLICY "Authenticated users with profile can create clans"
ON clans
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
  )
  AND captain_id = auth.uid()
);

-- Add comment
COMMENT ON POLICY "Authenticated users with profile can create clans" ON clans IS
  'Allows authenticated users to create clans if they have a profile and are setting themselves as captain';
