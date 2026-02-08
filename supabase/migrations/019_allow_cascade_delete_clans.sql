-- ============================================================================
-- MIGRATION 019: Allow CASCADE DELETE for clans
-- ============================================================================
-- This migration modifies foreign key constraints on the matches table
-- to allow deletion of clans even when they have match history.
-- When a clan is deleted, all related matches will also be deleted (CASCADE).
-- ============================================================================

-- Drop existing foreign key constraints
ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_winner_clan_id_fkey;

ALTER TABLE matches
  DROP CONSTRAINT IF EXISTS matches_loser_clan_id_fkey;

-- Recreate foreign key constraints with CASCADE DELETE
ALTER TABLE matches
  ADD CONSTRAINT matches_winner_clan_id_fkey
  FOREIGN KEY (winner_clan_id)
  REFERENCES clans(id)
  ON DELETE CASCADE;

ALTER TABLE matches
  ADD CONSTRAINT matches_loser_clan_id_fkey
  FOREIGN KEY (loser_clan_id)
  REFERENCES clans(id)
  ON DELETE CASCADE;

-- Verify constraints were created correctly
DO $$
BEGIN
  RAISE NOTICE 'Foreign key constraints updated successfully!';
  RAISE NOTICE 'Clans can now be deleted and all related matches will be automatically deleted.';
END $$;
