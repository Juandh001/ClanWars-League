-- Fix: UPDATE requires a WHERE clause error
-- Supabase blocks UPDATE without WHERE for safety
-- Solution: Add "WHERE true" to affect all rows

CREATE OR REPLACE FUNCTION start_new_season(
    season_name TEXT,
    season_number INTEGER,
    duration_days INTEGER DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    new_season_id UUID;
    active_season_id UUID;
BEGIN
    -- Close active season if exists
    SELECT id INTO active_season_id FROM seasons WHERE is_active = true;
    IF active_season_id IS NOT NULL THEN
        PERFORM close_season(active_season_id);
    END IF;

    -- Create new season
    INSERT INTO seasons (name, number, start_date, end_date, is_active)
    VALUES (
        season_name,
        season_number,
        NOW(),
        NOW() + (duration_days || ' days')::INTERVAL,
        true
    )
    RETURNING id INTO new_season_id;

    -- Reset clan stats (preserves historical data in season_clan_stats)
    -- Added "WHERE true" to satisfy Supabase's safety requirement
    UPDATE clans SET
        points = 0,
        power_wins = 0,
        matches_played = 0,
        matches_won = 0,
        matches_lost = 0,
        current_win_streak = 0,
        current_loss_streak = 0
    WHERE true;

    -- Reset warrior stats (preserves historical data in season_warrior_stats)
    -- Added "WHERE true" to satisfy Supabase's safety requirement
    UPDATE profiles SET
        warrior_points = 0,
        warrior_power_wins = 0,
        warrior_wins = 0,
        warrior_losses = 0,
        current_win_streak = 0,
        current_loss_streak = 0
    WHERE true;

    RETURN new_season_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
