-- Remove the trigger that's duplicating warrior stats updates
DROP TRIGGER IF EXISTS trigger_update_warrior_stats ON match_participants;
DROP FUNCTION IF EXISTS update_warrior_stats_from_participation();
