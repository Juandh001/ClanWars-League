-- ============================================================================
-- CORREGIR ESTADÍSTICAS COMPLETAS DE SEASON 3
-- El reporte antiguo solo actualizaba puntos, no contadores ni rachas
-- Este script recalcula TODAS las estadísticas desde cero
-- ============================================================================

DO $$
DECLARE
  clan_record RECORD;
  warrior_record RECORD;
  match_record RECORD;
  current_streak INTEGER;
  max_streak INTEGER;
BEGIN
  RAISE NOTICE '=== INICIANDO CORRECCIÓN DE ESTADÍSTICAS DE SEASON 3 ===';

  -- ========================================================================
  -- PASO 1: RESETEAR TODAS LAS ESTADÍSTICAS DE CLANES
  -- ========================================================================
  RAISE NOTICE 'Paso 1: Reseteando estadísticas de clanes...';

  UPDATE clans SET
    matches_played = 0,
    matches_won = 0,
    matches_lost = 0,
    power_wins = 0,
    current_win_streak = 0,
    current_loss_streak = 0,
    max_win_streak = 0
  WHERE true;

  -- ========================================================================
  -- PASO 2: RECALCULAR CONTADORES DE MATCHES PARA CADA CLAN
  -- ========================================================================
  RAISE NOTICE 'Paso 2: Recalculando contadores de matches...';

  FOR clan_record IN
    SELECT
      c.id,
      c.tag,
      COUNT(DISTINCT CASE WHEN m.winner_clan_id = c.id OR m.loser_clan_id = c.id THEN m.id END) as total_matches,
      COUNT(DISTINCT CASE WHEN m.winner_clan_id = c.id THEN m.id END) as total_wins,
      COUNT(DISTINCT CASE WHEN m.loser_clan_id = c.id THEN m.id END) as total_losses,
      COUNT(DISTINCT CASE WHEN m.winner_clan_id = c.id AND m.power_win = true THEN m.id END) as total_power_wins
    FROM clans c
    LEFT JOIN matches m ON (m.winner_clan_id = c.id OR m.loser_clan_id = c.id)
      AND m.season_id = '9f470595-db37-4186-84f6-2237914a19d7'
    GROUP BY c.id, c.tag
  LOOP
    UPDATE clans SET
      matches_played = clan_record.total_matches,
      matches_won = clan_record.total_wins,
      matches_lost = clan_record.total_losses,
      power_wins = clan_record.total_power_wins
    WHERE id = clan_record.id;

    IF clan_record.total_matches > 0 THEN
      RAISE NOTICE 'Clan %: % matches (% W / % L, % PW)',
        clan_record.tag, clan_record.total_matches, clan_record.total_wins,
        clan_record.total_losses, clan_record.total_power_wins;
    END IF;
  END LOOP;

  -- ========================================================================
  -- PASO 3: CALCULAR RACHAS DE CLANES
  -- ========================================================================
  RAISE NOTICE 'Paso 3: Calculando rachas de clanes...';

  FOR clan_record IN SELECT id, tag FROM clans
  LOOP
    current_streak := 0;
    max_streak := 0;

    -- Iterar matches en orden cronológico
    FOR match_record IN
      SELECT
        m.id,
        CASE
          WHEN m.winner_clan_id = clan_record.id THEN 'win'
          WHEN m.loser_clan_id = clan_record.id THEN 'loss'
          ELSE 'none'
        END as result
      FROM matches m
      WHERE (m.winner_clan_id = clan_record.id OR m.loser_clan_id = clan_record.id)
        AND m.season_id = '9f470595-db37-4186-84f6-2237914a19d7'
      ORDER BY m.created_at ASC
    LOOP
      IF match_record.result = 'win' THEN
        IF current_streak >= 0 THEN
          current_streak := current_streak + 1;
        ELSE
          current_streak := 1;
        END IF;

        IF current_streak > max_streak THEN
          max_streak := current_streak;
        END IF;
      ELSIF match_record.result = 'loss' THEN
        IF current_streak <= 0 THEN
          current_streak := current_streak - 1;
        ELSE
          current_streak := -1;
        END IF;
      END IF;
    END LOOP;

    -- Actualizar rachas del clan
    UPDATE clans SET
      current_win_streak = CASE WHEN current_streak > 0 THEN current_streak ELSE 0 END,
      current_loss_streak = CASE WHEN current_streak < 0 THEN ABS(current_streak) ELSE 0 END,
      max_win_streak = max_streak
    WHERE id = clan_record.id;

    IF max_streak > 0 THEN
      RAISE NOTICE 'Clan %: racha actual=%, max racha=%',
        clan_record.tag, current_streak, max_streak;
    END IF;
  END LOOP;

  -- ========================================================================
  -- PASO 4: RESETEAR ESTADÍSTICAS DE WARRIORS
  -- ========================================================================
  RAISE NOTICE 'Paso 4: Reseteando estadísticas de warriors...';

  UPDATE profiles SET
    warrior_wins = 0,
    warrior_losses = 0,
    warrior_power_wins = 0,
    current_win_streak = 0,
    current_loss_streak = 0,
    max_win_streak = 0
  WHERE true;

  -- ========================================================================
  -- PASO 5: RECALCULAR CONTADORES DE WARRIORS
  -- ========================================================================
  RAISE NOTICE 'Paso 5: Recalculando contadores de warriors...';

  FOR warrior_record IN
    SELECT
      p.id,
      p.nickname,
      COUNT(DISTINCT mp.match_id) as total_matches,
      COUNT(DISTINCT CASE WHEN mp.team = 'winner' THEN mp.match_id END) as total_wins,
      COUNT(DISTINCT CASE WHEN mp.team = 'loser' THEN mp.match_id END) as total_losses,
      COUNT(DISTINCT CASE WHEN mp.team = 'winner' AND m.power_win = true THEN mp.match_id END) as total_power_wins
    FROM profiles p
    LEFT JOIN match_participants mp ON mp.user_id = p.id
    LEFT JOIN matches m ON m.id = mp.match_id AND m.season_id = '9f470595-db37-4186-84f6-2237914a19d7'
    WHERE m.id IS NOT NULL
    GROUP BY p.id, p.nickname
  LOOP
    UPDATE profiles SET
      warrior_wins = warrior_record.total_wins,
      warrior_losses = warrior_record.total_losses,
      warrior_power_wins = warrior_record.total_power_wins
    WHERE id = warrior_record.id;

    RAISE NOTICE 'Warrior %: % W / % L (% PW)',
      warrior_record.nickname, warrior_record.total_wins,
      warrior_record.total_losses, warrior_record.total_power_wins;
  END LOOP;

  -- ========================================================================
  -- PASO 6: CALCULAR RACHAS DE WARRIORS
  -- ========================================================================
  RAISE NOTICE 'Paso 6: Calculando rachas de warriors...';

  FOR warrior_record IN
    SELECT DISTINCT p.id, p.nickname
    FROM profiles p
    JOIN match_participants mp ON mp.user_id = p.id
    JOIN matches m ON m.id = mp.match_id AND m.season_id = '9f470595-db37-4186-84f6-2237914a19d7'
  LOOP
    current_streak := 0;
    max_streak := 0;

    -- Iterar matches del warrior en orden cronológico
    FOR match_record IN
      SELECT
        mp.team
      FROM match_participants mp
      JOIN matches m ON m.id = mp.match_id
      WHERE mp.user_id = warrior_record.id
        AND m.season_id = '9f470595-db37-4186-84f6-2237914a19d7'
      ORDER BY m.created_at ASC
    LOOP
      IF match_record.team = 'winner' THEN
        IF current_streak >= 0 THEN
          current_streak := current_streak + 1;
        ELSE
          current_streak := 1;
        END IF;

        IF current_streak > max_streak THEN
          max_streak := current_streak;
        END IF;
      ELSIF match_record.team = 'loser' THEN
        IF current_streak <= 0 THEN
          current_streak := current_streak - 1;
        ELSE
          current_streak := -1;
        END IF;
      END IF;
    END LOOP;

    -- Actualizar rachas del warrior
    UPDATE profiles SET
      current_win_streak = CASE WHEN current_streak > 0 THEN current_streak ELSE 0 END,
      current_loss_streak = CASE WHEN current_streak < 0 THEN ABS(current_streak) ELSE 0 END,
      max_win_streak = max_streak
    WHERE id = warrior_record.id;

    IF max_streak > 0 THEN
      RAISE NOTICE 'Warrior %: racha actual=%, max racha=%',
        warrior_record.nickname, current_streak, max_streak;
    END IF;
  END LOOP;

  RAISE NOTICE '=== CORRECCIÓN DE ESTADÍSTICAS COMPLETADA ===';
END $$;

-- ============================================================================
-- VERIFICACIÓN - Ver el resultado de la corrección
-- ============================================================================

-- Verificación de clanes
SELECT
  c.tag,
  c.name,
  c.points,
  c.matches_played,
  c.matches_won,
  c.matches_lost,
  c.power_wins,
  c.current_win_streak,
  c.current_loss_streak,
  c.max_win_streak
FROM clans c
WHERE c.matches_played > 0
ORDER BY c.points DESC;

-- Verificación de warriors (Top 20)
SELECT
  p.nickname,
  p.warrior_points,
  p.warrior_wins,
  p.warrior_losses,
  p.warrior_power_wins,
  p.current_win_streak,
  p.current_loss_streak,
  p.max_win_streak
FROM profiles p
WHERE p.warrior_wins > 0 OR p.warrior_losses > 0
ORDER BY p.warrior_points DESC
LIMIT 20;
