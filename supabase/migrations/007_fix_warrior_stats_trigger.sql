-- =============================================
-- MIGRATION 007: Fix Warrior Stats Trigger
-- =============================================
-- This migration fixes the trigger to use points_awarded from the match
-- instead of hardcoded values (3-4 points)

-- 1. Update the function to use points_awarded from match
CREATE OR REPLACE FUNCTION update_warrior_stats_from_participation()
RETURNS TRIGGER AS $$
DECLARE
    match_record RECORD;
    is_winner BOOLEAN;
    points_to_add INTEGER;
    is_power_win BOOLEAN;
BEGIN
    -- Get match details
    SELECT * INTO match_record FROM matches WHERE id = NEW.match_id;

    -- Determine if this participant is on the winning team
    is_winner := NEW.team = 'winner';
    is_power_win := match_record.power_win;

    IF is_winner THEN
        -- Winner gets points_awarded from the match record
        points_to_add := match_record.points_awarded;

        UPDATE profiles SET
            warrior_points = warrior_points + points_to_add,
            warrior_wins = warrior_wins + 1,
            warrior_power_wins = warrior_power_wins + CASE WHEN is_power_win THEN 1 ELSE 0 END,
            current_win_streak = current_win_streak + 1,
            current_loss_streak = 0,
            max_win_streak = GREATEST(max_win_streak, current_win_streak + 1)
        WHERE id = NEW.user_id;
    ELSE
        -- Loser gets no points but stats update
        UPDATE profiles SET
            warrior_losses = warrior_losses + 1,
            current_loss_streak = current_loss_streak + 1,
            current_win_streak = 0
        WHERE id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recalculate all warrior stats from match_participants
-- First, reset all warrior stats to 0
UPDATE profiles SET
    warrior_points = 0,
    warrior_wins = 0,
    warrior_losses = 0,
    warrior_power_wins = 0,
    current_win_streak = 0,
    current_loss_streak = 0,
    max_win_streak = 0;

-- 3. Recalculate warrior stats from match_participants
WITH warrior_stats AS (
    SELECT
        mp.user_id,
        SUM(CASE WHEN mp.team = 'winner' THEN m.points_awarded ELSE 0 END) as total_points,
        SUM(CASE WHEN mp.team = 'winner' THEN 1 ELSE 0 END) as total_wins,
        SUM(CASE WHEN mp.team = 'loser' THEN 1 ELSE 0 END) as total_losses,
        SUM(CASE WHEN mp.team = 'winner' AND m.power_win THEN 1 ELSE 0 END) as total_power_wins
    FROM match_participants mp
    JOIN matches m ON mp.match_id = m.id
    GROUP BY mp.user_id
)
UPDATE profiles p
SET
    warrior_points = ws.total_points,
    warrior_wins = ws.total_wins,
    warrior_losses = ws.total_losses,
    warrior_power_wins = ws.total_power_wins
FROM warrior_stats ws
WHERE p.id = ws.user_id;

-- 4. Recalculate clan stats from matches
-- First, reset clan stats
UPDATE clans SET
    points = 0,
    power_wins = 0,
    matches_played = 0,
    matches_won = 0,
    matches_lost = 0,
    current_win_streak = 0,
    current_loss_streak = 0,
    max_win_streak = 0;

-- 5. Recalculate clan stats from matches
WITH clan_wins AS (
    SELECT
        winner_clan_id as clan_id,
        SUM(points_awarded) as total_points,
        COUNT(*) as wins,
        SUM(CASE WHEN power_win THEN 1 ELSE 0 END) as power_wins
    FROM matches
    GROUP BY winner_clan_id
),
clan_losses AS (
    SELECT
        loser_clan_id as clan_id,
        COUNT(*) as losses
    FROM matches
    GROUP BY loser_clan_id
)
UPDATE clans c
SET
    points = COALESCE(cw.total_points, 0),
    power_wins = COALESCE(cw.power_wins, 0),
    matches_won = COALESCE(cw.wins, 0),
    matches_lost = COALESCE(cl.losses, 0),
    matches_played = COALESCE(cw.wins, 0) + COALESCE(cl.losses, 0)
FROM clan_wins cw
FULL OUTER JOIN clan_losses cl ON cw.clan_id = cl.clan_id
WHERE c.id = COALESCE(cw.clan_id, cl.clan_id);
