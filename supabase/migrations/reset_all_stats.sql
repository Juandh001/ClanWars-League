-- Reset all match data and statistics
-- WARNING: This will delete ALL matches, participants, and reset clan/warrior stats

BEGIN;

-- Delete all match participants
DELETE FROM match_participants;

-- Delete all matches
DELETE FROM matches;

-- Reset all clan statistics
UPDATE clans
SET
  points = 0,
  matches_played = 0,
  matches_won = 0,
  matches_lost = 0,
  power_wins = 0,
  current_win_streak = 0,
  current_loss_streak = 0,
  max_win_streak = 0,
  updated_at = NOW();

-- Reset all warrior statistics in profiles
UPDATE profiles
SET
  warrior_points = 0,
  warrior_wins = 0,
  warrior_losses = 0,
  warrior_power_wins = 0,
  current_win_streak = 0,
  current_loss_streak = 0,
  max_win_streak = 0,
  updated_at = NOW();

COMMIT;

-- Verification queries (run these to check the reset worked)
-- SELECT 'Matches' as table_name, COUNT(*) as count FROM matches
-- UNION ALL
-- SELECT 'Match Participants', COUNT(*) FROM match_participants
-- UNION ALL
-- SELECT 'Clans with points', COUNT(*) FROM clans WHERE points > 0
-- UNION ALL
-- SELECT 'Warriors with points', COUNT(*) FROM profiles WHERE warrior_points > 0;
