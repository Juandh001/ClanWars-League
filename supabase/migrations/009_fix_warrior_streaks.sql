-- =============================================
-- MIGRATION 009: Fix Warrior Streaks
-- =============================================
-- This migration recalculates warrior streaks that were not being tracked

-- Recalculate warrior streaks from match history
DO $$
DECLARE
    warrior_rec RECORD;
    match_rec RECORD;
    win_streak INTEGER;
    loss_streak INTEGER;
    max_win INTEGER;
    temp_streak INTEGER;
BEGIN
    -- Process each warrior who has participated in matches
    FOR warrior_rec IN SELECT DISTINCT user_id FROM match_participants LOOP
        win_streak := 0;
        loss_streak := 0;
        max_win := 0;
        temp_streak := 0;

        -- Calculate current streak (most recent matches first)
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
                    EXIT; -- Streak broken
                END IF;
            ELSE
                IF win_streak = 0 THEN
                    loss_streak := loss_streak + 1;
                ELSE
                    EXIT; -- Streak broken
                END IF;
            END IF;
        END LOOP;

        -- Calculate max win streak (chronological order)
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

        -- Update the warrior profile
        UPDATE profiles
        SET
            current_win_streak = win_streak,
            current_loss_streak = loss_streak,
            max_win_streak = max_win
        WHERE id = warrior_rec.user_id;
    END LOOP;
END $$;
