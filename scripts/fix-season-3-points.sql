-- ============================================================================
-- CORREGIR PUNTOS DE MATCHES DE SEASON 3
-- Los matches fueron reportados con la función antigua que daba siempre 100 pts
-- Este script recalcula los puntos correctos según el modo de juego
-- ============================================================================

DO $$
DECLARE
  match_record RECORD;
  correct_points INTEGER;
  points_diff INTEGER;
BEGIN
  -- Iterar sobre cada match de Season 3 que necesita corrección
  FOR match_record IN
    SELECT
      m.id,
      m.match_mode,
      m.points_awarded as old_points,
      m.winner_clan_id,
      m.loser_clan_id,
      m.power_win,
      m.power_points_bonus
    FROM matches m
    WHERE m.season_id = '9f470595-db37-4186-84f6-2237914a19d7'
  LOOP
    -- Calcular los puntos correctos según el modo
    correct_points := CASE match_record.match_mode
      WHEN '1v1' THEN 100
      WHEN '2v2' THEN 120
      WHEN '3v3' THEN 150
      WHEN '4v4' THEN 180
      WHEN '5v5' THEN 220
      WHEN '6v6' THEN 250
      ELSE 100
    END;

    -- Agregar bonus de power win si corresponde
    IF match_record.power_win THEN
      correct_points := correct_points + COALESCE(match_record.power_points_bonus, 0);
    END IF;

    -- Calcular la diferencia
    points_diff := correct_points - match_record.old_points;

    -- Si hay diferencia, actualizar
    IF points_diff != 0 THEN
      RAISE NOTICE 'Match % (%): Ajustando de % a % pts (diff: %)',
        match_record.id, match_record.match_mode, match_record.old_points, correct_points, points_diff;

      -- Actualizar el match
      UPDATE matches
      SET points_awarded = correct_points
      WHERE id = match_record.id;

      -- Actualizar puntos del clan ganador
      UPDATE clans
      SET points = points + points_diff
      WHERE id = match_record.winner_clan_id;

      -- Actualizar puntos de los warriors ganadores
      UPDATE profiles
      SET warrior_points = warrior_points + points_diff
      WHERE id IN (
        SELECT user_id
        FROM match_participants
        WHERE match_id = match_record.id AND team = 'winner'
      );

      RAISE NOTICE 'Match % actualizado correctamente', match_record.id;
    END IF;
  END LOOP;

  RAISE NOTICE 'Corrección de puntos completada!';
END $$;

-- ============================================================================
-- VERIFICACIÓN - Ver el resultado de la corrección
-- ============================================================================
SELECT
  m.match_mode,
  COUNT(*) as total_matches,
  AVG(m.points_awarded) as avg_points,
  MIN(m.points_awarded) as min_points,
  MAX(m.points_awarded) as max_points
FROM matches m
WHERE m.season_id = '9f470595-db37-4186-84f6-2237914a19d7'
GROUP BY m.match_mode
ORDER BY m.match_mode;

-- Ver los puntos actuales de los clanes después de la corrección
SELECT
  c.tag,
  c.name,
  c.points,
  c.matches_played,
  c.matches_won,
  c.matches_lost
FROM clans c
WHERE c.matches_played > 0
ORDER BY c.points DESC;
