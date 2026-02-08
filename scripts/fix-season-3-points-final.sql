-- ============================================================================
-- RECALCULAR PUNTOS DE SEASON 3 (FINAL)
-- Los contadores y rachas ya están correctos gracias a fix-season-3-stats.sql
-- Este script solo recalcula los puntos basándose en los matches
-- ============================================================================

DO $$
DECLARE
  clan_record RECORD;
  warrior_record RECORD;
  calculated_points INTEGER;
BEGIN
  RAISE NOTICE '=== RECALCULANDO PUNTOS DE SEASON 3 ===';

  -- ========================================================================
  -- PASO 1: RECALCULAR PUNTOS DE CLANES
  -- ========================================================================
  RAISE NOTICE 'Paso 1: Recalculando puntos de clanes...';

  FOR clan_record IN
    SELECT
      c.id,
      c.tag,
      c.points as current_points,
      COALESCE(SUM(CASE WHEN m.winner_clan_id = c.id THEN m.points_awarded ELSE 0 END), 0) as correct_points
    FROM clans c
    LEFT JOIN matches m ON m.winner_clan_id = c.id AND m.season_id = '9f470595-db37-4186-84f6-2237914a19d7'
    GROUP BY c.id, c.tag, c.points
  LOOP
    IF clan_record.current_points != clan_record.correct_points THEN
      UPDATE clans SET points = clan_record.correct_points WHERE id = clan_record.id;

      RAISE NOTICE 'Clan %: % pts -> % pts',
        clan_record.tag, clan_record.current_points, clan_record.correct_points;
    END IF;
  END LOOP;

  -- ========================================================================
  -- PASO 2: RECALCULAR PUNTOS DE WARRIORS
  -- ========================================================================
  RAISE NOTICE 'Paso 2: Recalculando puntos de warriors...';

  FOR warrior_record IN
    SELECT
      p.id,
      p.nickname,
      p.warrior_points as current_points,
      COALESCE(SUM(CASE WHEN mp.team = 'winner' THEN m.points_awarded ELSE 0 END), 0) as correct_points
    FROM profiles p
    LEFT JOIN match_participants mp ON mp.user_id = p.id
    LEFT JOIN matches m ON m.id = mp.match_id AND m.season_id = '9f470595-db37-4186-84f6-2237914a19d7'
    GROUP BY p.id, p.nickname, p.warrior_points
  LOOP
    IF warrior_record.current_points != warrior_record.correct_points THEN
      UPDATE profiles SET warrior_points = warrior_record.correct_points WHERE id = warrior_record.id;

      RAISE NOTICE 'Warrior %: % pts -> % pts',
        warrior_record.nickname, warrior_record.current_points, warrior_record.correct_points;
    END IF;
  END LOOP;

  RAISE NOTICE '=== RECALCULO DE PUNTOS COMPLETADO ===';
END $$;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que puntos coincidan con matches
SELECT
  c.tag,
  c.points as clan_points,
  COALESCE(SUM(CASE WHEN m.winner_clan_id = c.id THEN m.points_awarded ELSE 0 END), 0) as calculated_points,
  c.matches_played,
  c.matches_won,
  c.current_win_streak,
  c.max_win_streak
FROM clans c
LEFT JOIN matches m ON (m.winner_clan_id = c.id OR m.loser_clan_id = c.id)
  AND m.season_id = '9f470595-db37-4186-84f6-2237914a19d7'
GROUP BY c.id, c.tag, c.points, c.matches_played, c.matches_won, c.current_win_streak, c.max_win_streak
HAVING COUNT(DISTINCT CASE WHEN m.winner_clan_id = c.id OR m.loser_clan_id = c.id THEN m.id END) > 0
ORDER BY c.points DESC;

-- Verificar warriors
SELECT
  p.nickname,
  p.warrior_points,
  COALESCE(SUM(CASE WHEN mp.team = 'winner' THEN m.points_awarded ELSE 0 END), 0) as calculated_points,
  p.warrior_wins,
  p.warrior_losses,
  p.current_win_streak,
  p.max_win_streak
FROM profiles p
LEFT JOIN match_participants mp ON mp.user_id = p.id
LEFT JOIN matches m ON m.id = mp.match_id AND m.season_id = '9f470595-db37-4186-84f6-2237914a19d7'
WHERE EXISTS (
  SELECT 1 FROM match_participants mp2
  JOIN matches m2 ON m2.id = mp2.match_id
  WHERE mp2.user_id = p.id AND m2.season_id = '9f470595-db37-4186-84f6-2237914a19d7'
)
GROUP BY p.id, p.nickname, p.warrior_points, p.warrior_wins, p.warrior_losses, p.current_win_streak, p.max_win_streak
ORDER BY p.warrior_points DESC
LIMIT 20;
