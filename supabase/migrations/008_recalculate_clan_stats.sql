-- =============================================
-- MIGRATION 008: Recalculate Clan & Warrior Stats
-- =============================================
-- This migration recalculates all clan and warrior statistics
-- from matches and match_participants tables to fix desynchronization

-- 1. Reset all clan stats to 0
UPDATE clans SET
    points = 0,
    power_wins = 0,
    matches_played = 0,
    matches_won = 0,
    matches_lost = 0,
    current_win_streak = 0,
    current_loss_streak = 0,
    max_win_streak = 0;

-- 2. Recalculate clan stats from matches
WITH clan_wins AS (
    SELECT
        winner_clan_id as clan_id,
        SUM(points_awarded) as total_points,
        COUNT(*) as wins
    FROM matches
    GROUP BY winner_clan_id
),
clan_losses AS (
    SELECT
        loser_clan_id as clan_id,
        COUNT(*) as losses
    FROM matches
    GROUP BY loser_clan_id
),
clan_stats AS (
    SELECT
        COALESCE(cw.clan_id, cl.clan_id) as clan_id,
        COALESCE(cw.total_points, 0) as total_points,
        COALESCE(cw.wins, 0) as wins,
        COALESCE(cl.losses, 0) as losses
    FROM clan_wins cw
    FULL OUTER JOIN clan_losses cl ON cw.clan_id = cl.clan_id
)
UPDATE clans c
SET
    points = cs.total_points,
    matches_won = cs.wins,
    matches_lost = cs.losses,
    matches_played = cs.wins + cs.losses
FROM clan_stats cs
WHERE c.id = cs.clan_id;

-- 3. Recalculate streaks from match history (ordered by date)
-- This is more complex as we need to iterate through matches in order
-- For now, we'll set current streaks based on most recent matches

-- Calculate current win/loss streaks for each clan
DO $$
DECLARE
    clan_rec RECORD;
    match_rec RECORD;
    win_streak INTEGER;
    loss_streak INTEGER;
    max_win INTEGER;
BEGIN
    FOR clan_rec IN SELECT id FROM clans LOOP
        win_streak := 0;
        loss_streak := 0;
        max_win := 0;

        -- Iterate through matches for this clan, most recent first
        FOR match_rec IN
            SELECT
                CASE WHEN winner_clan_id = clan_rec.id THEN 'win' ELSE 'loss' END as result
            FROM matches
            WHERE winner_clan_id = clan_rec.id OR loser_clan_id = clan_rec.id
            ORDER BY created_at DESC
        LOOP
            IF match_rec.result = 'win' THEN
                IF loss_streak = 0 THEN
                    win_streak := win_streak + 1;
                ELSE
                    EXIT; -- Streak broken, stop counting
                END IF;
            ELSE
                IF win_streak = 0 THEN
                    loss_streak := loss_streak + 1;
                ELSE
                    EXIT; -- Streak broken, stop counting
                END IF;
            END IF;
        END LOOP;

        -- Calculate max win streak by going through all matches chronologically
        DECLARE
            temp_streak INTEGER := 0;
        BEGIN
            FOR match_rec IN
                SELECT
                    CASE WHEN winner_clan_id = clan_rec.id THEN 'win' ELSE 'loss' END as result
                FROM matches
                WHERE winner_clan_id = clan_rec.id OR loser_clan_id = clan_rec.id
                ORDER BY created_at ASC
            LOOP
                IF match_rec.result = 'win' THEN
                    temp_streak := temp_streak + 1;
                    IF temp_streak > max_win THEN
                        max_win := temp_streak;
                    END IF;
                ELSE
                    temp_streak := 0;
                END IF;
            END LOOP;
        END;

        -- Update the clan
        UPDATE clans
        SET
            current_win_streak = win_streak,
            current_loss_streak = loss_streak,
            max_win_streak = max_win
        WHERE id = clan_rec.id;
    END LOOP;
END $$;

-- =============================================
-- WARRIOR STATS RECALCULATION
-- =============================================

-- 4. Reset all warrior stats to 0
UPDATE profiles SET
    warrior_points = 0,
    warrior_wins = 0,
    warrior_losses = 0,
    warrior_power_wins = 0,
    current_win_streak = 0,
    current_loss_streak = 0,
    max_win_streak = 0;

-- 5. Recalculate warrior stats from match_participants
WITH warrior_stats AS (
    SELECT
        mp.user_id,
        SUM(CASE WHEN mp.team = 'winner' THEN m.points_awarded ELSE 0 END) as total_points,
        SUM(CASE WHEN mp.team = 'winner' THEN 1 ELSE 0 END) as total_wins,
        SUM(CASE WHEN mp.team = 'loser' THEN 1 ELSE 0 END) as total_losses
    FROM match_participants mp
    JOIN matches m ON mp.match_id = m.id
    GROUP BY mp.user_id
)
UPDATE profiles p
SET
    warrior_points = ws.total_points,
    warrior_wins = ws.total_wins,
    warrior_losses = ws.total_losses
FROM warrior_stats ws
WHERE p.id = ws.user_id;

-- 6. Recalculate warrior streaks from match history
DO $$
DECLARE
    warrior_rec RECORD;
    match_rec RECORD;
    win_streak INTEGER;
    loss_streak INTEGER;
    max_win INTEGER;
BEGIN
    FOR warrior_rec IN SELECT DISTINCT user_id FROM match_participants LOOP
        win_streak := 0;
        loss_streak := 0;
        max_win := 0;

        -- Calculate current streak (most recent first)
        FOR match_rec IN
            SELECT mp.team as result
            FROM match_participants mp
            JOIN matches m ON m.id = mp.match_id
            WHERE mp.user_id = warrior_rec.user_id
            ORDER BY m.created_at DESC
        LOOP
            IF match_rec.result = 'winner' THEN
                IF loss_streak = 0 THEN
                    win_streak := win_streak + 1;
                ELSE
                    EXIT;
                END IF;
            ELSE
                IF win_streak = 0 THEN
                    loss_streak := loss_streak + 1;
                ELSE
                    EXIT;
                END IF;
            END IF;
        END LOOP;

        -- Calculate max win streak (chronological order)
        DECLARE
            temp_streak INTEGER := 0;
        BEGIN
            FOR match_rec IN
                SELECT mp.team as result
                FROM match_participants mp
                JOIN matches m ON m.id = mp.match_id
                WHERE mp.user_id = warrior_rec.user_id
                ORDER BY m.created_at ASC
            LOOP
                IF match_rec.result = 'winner' THEN
                    temp_streak := temp_streak + 1;
                    IF temp_streak > max_win THEN
                        max_win := temp_streak;
                    END IF;
                ELSE
                    temp_streak := 0;
                END IF;
            END LOOP;
        END;

        -- Update the warrior
        UPDATE profiles
        SET
            current_win_streak = win_streak,
            current_loss_streak = loss_streak,
            max_win_streak = max_win
        WHERE id = warrior_rec.user_id;
    END LOOP;
END $$;
