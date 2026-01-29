-- Fix: Otorgar medallas sin importar si hubo partidos
-- Ahora otorga medallas a todos los clanes y guerreros (con clan) ordenados por puntos

CREATE OR REPLACE FUNCTION close_season(season_id_param UUID)
RETURNS VOID AS $$
DECLARE
    clan_record RECORD;
    warrior_record RECORD;
    rank_counter INTEGER := 1;
BEGIN
    -- Save final clan stats ordered by points (ALL clans, not just those with matches)
    FOR clan_record IN
        SELECT * FROM clans
        ORDER BY points DESC, power_wins DESC, matches_won DESC, name ASC
    LOOP
        INSERT INTO season_clan_stats (
            season_id, clan_id, final_rank, points, power_wins,
            matches_played, matches_won, matches_lost, max_win_streak
        )
        VALUES (
            season_id_param, clan_record.id, rank_counter,
            clan_record.points, clan_record.power_wins,
            clan_record.matches_played, clan_record.matches_won,
            clan_record.matches_lost, clan_record.max_win_streak
        )
        ON CONFLICT (season_id, clan_id) DO NOTHING;

        -- Award badges to top 3
        IF rank_counter <= 3 THEN
            INSERT INTO badges (season_id, target_id, category, badge_type, rank)
            VALUES (
                season_id_param, clan_record.id, 'clan',
                CASE rank_counter
                    WHEN 1 THEN 'gold'::badge_type
                    WHEN 2 THEN 'silver'::badge_type
                    WHEN 3 THEN 'bronze'::badge_type
                END,
                rank_counter
            )
            ON CONFLICT (season_id, target_id, category) DO NOTHING;
        END IF;

        rank_counter := rank_counter + 1;
    END LOOP;

    -- Save final warrior stats (ALL warriors who have a clan)
    rank_counter := 1;
    FOR warrior_record IN
        SELECT p.*, cm.clan_id
        FROM profiles p
        INNER JOIN clan_members cm ON cm.user_id = p.id
        ORDER BY p.warrior_points DESC, p.warrior_power_wins DESC, p.warrior_wins DESC, p.nickname ASC
    LOOP
        INSERT INTO season_warrior_stats (
            season_id, user_id, clan_id, final_rank, points, power_wins,
            matches_played, wins, losses, max_win_streak
        )
        VALUES (
            season_id_param, warrior_record.id, warrior_record.clan_id,
            rank_counter, warrior_record.warrior_points, warrior_record.warrior_power_wins,
            warrior_record.warrior_wins + warrior_record.warrior_losses,
            warrior_record.warrior_wins, warrior_record.warrior_losses,
            warrior_record.max_win_streak
        )
        ON CONFLICT (season_id, user_id) DO NOTHING;

        -- Award badges to top 3 warriors
        IF rank_counter <= 3 THEN
            INSERT INTO badges (season_id, target_id, category, badge_type, rank)
            VALUES (
                season_id_param, warrior_record.id, 'warrior',
                CASE rank_counter
                    WHEN 1 THEN 'gold'::badge_type
                    WHEN 2 THEN 'silver'::badge_type
                    WHEN 3 THEN 'bronze'::badge_type
                END,
                rank_counter
            )
            ON CONFLICT (season_id, target_id, category) DO NOTHING;
        END IF;

        rank_counter := rank_counter + 1;
    END LOOP;

    -- Mark season as inactive
    UPDATE seasons SET is_active = false WHERE id = season_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
