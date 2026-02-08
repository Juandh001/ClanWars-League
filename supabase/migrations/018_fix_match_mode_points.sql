-- Fix match mode points calculation to match frontend multipliers
-- 1v1: 100, 2v2: 120, 3v3: 150, 4v4: 180, 5v5: 220, 6v6: 250

CREATE OR REPLACE FUNCTION report_match(
  p_winner_clan_id UUID,
  p_loser_clan_id UUID,
  p_reported_by UUID,
  p_winner_score INTEGER,
  p_loser_score INTEGER,
  p_match_mode match_mode,
  p_notes TEXT,
  p_winner_player_ids UUID[],
  p_loser_player_ids UUID[]
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_match_id UUID;
  v_points_awarded INTEGER;
  v_power_win BOOLEAN;
  v_power_points_bonus INTEGER;
  v_season_id UUID;
  v_winner_clan RECORD;
  v_loser_clan RECORD;
  v_new_win_streak INTEGER;
  v_new_loss_streak INTEGER;
  v_player_id UUID;
  v_result JSON;
  v_loop_count INTEGER;
BEGIN
  -- Log the input arrays
  RAISE NOTICE 'Winner player IDs array: %', p_winner_player_ids;
  RAISE NOTICE 'Loser player IDs array: %', p_loser_player_ids;
  RAISE NOTICE 'Winner array length: %', array_length(p_winner_player_ids, 1);
  RAISE NOTICE 'Loser array length: %', array_length(p_loser_player_ids, 1);
  RAISE NOTICE 'Match mode: %', p_match_mode;

  -- Get active season
  SELECT id INTO v_season_id
  FROM seasons
  WHERE is_active = true
  LIMIT 1;

  -- Calculate points based on match mode with correct multipliers
  -- Base: 100 PP × Format Multiplier
  v_points_awarded := CASE p_match_mode
    WHEN '1v1' THEN 100  -- 100 × 1.0
    WHEN '2v2' THEN 120  -- 100 × 1.2
    WHEN '3v3' THEN 150  -- 100 × 1.5
    WHEN '4v4' THEN 180  -- 100 × 1.8
    WHEN '5v5' THEN 220  -- 100 × 2.2
    WHEN '6v6' THEN 250  -- 100 × 2.5
    ELSE 100
  END;

  RAISE NOTICE 'Points awarded for mode %: %', p_match_mode, v_points_awarded;

  -- Check if it's a power win (5-0, 5-1, 6-0, 6-1)
  v_power_win := (
    (p_winner_score = 5 AND p_loser_score <= 1) OR
    (p_winner_score = 6 AND p_loser_score <= 1)
  );

  v_power_points_bonus := CASE WHEN v_power_win THEN 50 ELSE 0 END;

  IF v_power_win THEN
    v_points_awarded := v_points_awarded + v_power_points_bonus;
    RAISE NOTICE 'Power win detected! Total points with bonus: %', v_points_awarded;
  END IF;

  -- Get current clan data
  SELECT * INTO v_winner_clan FROM clans WHERE id = p_winner_clan_id;
  SELECT * INTO v_loser_clan FROM clans WHERE id = p_loser_clan_id;

  -- Calculate new streaks for winner
  v_new_win_streak := COALESCE(v_winner_clan.current_win_streak, 0) + 1;

  -- Calculate new streaks for loser
  v_new_loss_streak := COALESCE(v_loser_clan.current_loss_streak, 0) + 1;

  -- Create match record
  INSERT INTO matches (
    winner_clan_id,
    loser_clan_id,
    reported_by,
    winner_score,
    loser_score,
    points_awarded,
    power_win,
    power_points_bonus,
    match_mode,
    notes,
    season_id
  ) VALUES (
    p_winner_clan_id,
    p_loser_clan_id,
    p_reported_by,
    p_winner_score,
    p_loser_score,
    v_points_awarded,
    v_power_win,
    v_power_points_bonus,
    p_match_mode,
    p_notes,
    v_season_id
  ) RETURNING id INTO v_match_id;

  RAISE NOTICE 'Match created with ID: %', v_match_id;

  -- Create match participants for winners
  v_loop_count := 0;
  FOREACH v_player_id IN ARRAY p_winner_player_ids
  LOOP
    v_loop_count := v_loop_count + 1;
    RAISE NOTICE 'Winner loop iteration %: Processing player %', v_loop_count, v_player_id;

    INSERT INTO match_participants (match_id, user_id, clan_id, team)
    VALUES (v_match_id, v_player_id, p_winner_clan_id, 'winner');
  END LOOP;
  RAISE NOTICE 'Total winner loops: %', v_loop_count;

  -- Create match participants for losers
  v_loop_count := 0;
  FOREACH v_player_id IN ARRAY p_loser_player_ids
  LOOP
    v_loop_count := v_loop_count + 1;
    RAISE NOTICE 'Loser loop iteration %: Processing player %', v_loop_count, v_player_id;

    INSERT INTO match_participants (match_id, user_id, clan_id, team)
    VALUES (v_match_id, v_player_id, p_loser_clan_id, 'loser');
  END LOOP;
  RAISE NOTICE 'Total loser loops: %', v_loop_count;

  -- Update winner clan stats
  UPDATE clans
  SET
    points = COALESCE(points, 0) + v_points_awarded,
    matches_played = COALESCE(matches_played, 0) + 1,
    matches_won = COALESCE(matches_won, 0) + 1,
    power_wins = COALESCE(power_wins, 0) + (CASE WHEN v_power_win THEN 1 ELSE 0 END),
    current_win_streak = v_new_win_streak,
    current_loss_streak = 0,
    max_win_streak = GREATEST(COALESCE(max_win_streak, 0), v_new_win_streak),
    updated_at = NOW()
  WHERE id = p_winner_clan_id;

  RAISE NOTICE 'Winner clan stats updated. Points added: %', v_points_awarded;

  -- Update loser clan stats
  UPDATE clans
  SET
    matches_played = COALESCE(matches_played, 0) + 1,
    matches_lost = COALESCE(matches_lost, 0) + 1,
    current_win_streak = 0,
    current_loss_streak = v_new_loss_streak,
    updated_at = NOW()
  WHERE id = p_loser_clan_id;

  -- Update winner warriors stats
  v_loop_count := 0;
  FOREACH v_player_id IN ARRAY p_winner_player_ids
  LOOP
    v_loop_count := v_loop_count + 1;
    RAISE NOTICE 'Updating winner warrior % (iteration %)', v_player_id, v_loop_count;

    UPDATE profiles
    SET
      warrior_points = COALESCE(warrior_points, 0) + v_points_awarded,
      warrior_wins = COALESCE(warrior_wins, 0) + 1,
      warrior_power_wins = COALESCE(warrior_power_wins, 0) + (CASE WHEN v_power_win THEN 1 ELSE 0 END),
      current_win_streak = COALESCE(current_win_streak, 0) + 1,
      current_loss_streak = 0,
      max_win_streak = GREATEST(COALESCE(max_win_streak, 0), COALESCE(current_win_streak, 0) + 1),
      updated_at = NOW()
    WHERE id = v_player_id;

    RAISE NOTICE 'Winner warrior % updated with % points', v_player_id, v_points_awarded;
  END LOOP;
  RAISE NOTICE 'Total winner warrior update loops: %', v_loop_count;

  -- Update loser warriors stats
  v_loop_count := 0;
  FOREACH v_player_id IN ARRAY p_loser_player_ids
  LOOP
    v_loop_count := v_loop_count + 1;
    RAISE NOTICE 'Updating loser warrior % (iteration %)', v_player_id, v_loop_count;

    UPDATE profiles
    SET
      warrior_losses = COALESCE(warrior_losses, 0) + 1,
      current_win_streak = 0,
      current_loss_streak = COALESCE(current_loss_streak, 0) + 1,
      updated_at = NOW()
    WHERE id = v_player_id;

    RAISE NOTICE 'Loser warrior % updated', v_player_id;
  END LOOP;
  RAISE NOTICE 'Total loser warrior update loops: %', v_loop_count;

  -- Return the created match with related data
  SELECT json_build_object(
    'id', m.id,
    'winner_clan_id', m.winner_clan_id,
    'loser_clan_id', m.loser_clan_id,
    'winner_score', m.winner_score,
    'loser_score', m.loser_score,
    'points_awarded', m.points_awarded,
    'power_win', m.power_win,
    'power_points_bonus', m.power_points_bonus,
    'match_mode', m.match_mode,
    'created_at', m.created_at
  ) INTO v_result
  FROM matches m
  WHERE m.id = v_match_id;

  RAISE NOTICE 'Match result: %', v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION report_match TO authenticated;
