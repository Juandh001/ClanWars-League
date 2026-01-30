-- Create audit table to track function executions
CREATE TABLE IF NOT EXISTS function_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  parameters JSONB,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Modified function with audit logging
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
BEGIN
  -- Log function execution
  INSERT INTO function_audit (function_name, parameters)
  VALUES ('report_match', jsonb_build_object(
    'winner_clan_id', p_winner_clan_id,
    'loser_clan_id', p_loser_clan_id,
    'winner_player_ids', p_winner_player_ids,
    'loser_player_ids', p_loser_player_ids,
    'match_mode', p_match_mode
  ));

  -- Get active season
  SELECT id INTO v_season_id
  FROM seasons
  WHERE is_active = true
  LIMIT 1;

  -- Calculate points based on match mode
  v_points_awarded := CASE p_match_mode
    WHEN '1v1' THEN 100
    WHEN '2v2' THEN 100
    WHEN '3v3' THEN 100
    WHEN '4v4' THEN 100
    WHEN '5v5' THEN 100
    WHEN '6v6' THEN 100
    ELSE 100
  END;

  -- Check if it's a power win (5-0, 5-1, 6-0, 6-1)
  v_power_win := (
    (p_winner_score = 5 AND p_loser_score <= 1) OR
    (p_winner_score = 6 AND p_loser_score <= 1)
  );

  v_power_points_bonus := CASE WHEN v_power_win THEN 50 ELSE 0 END;

  IF v_power_win THEN
    v_points_awarded := v_points_awarded + v_power_points_bonus;
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

  -- Create match participants for winners
  FOREACH v_player_id IN ARRAY p_winner_player_ids
  LOOP
    INSERT INTO match_participants (match_id, user_id, clan_id, team)
    VALUES (v_match_id, v_player_id, p_winner_clan_id, 'winner');
  END LOOP;

  -- Create match participants for losers
  FOREACH v_player_id IN ARRAY p_loser_player_ids
  LOOP
    INSERT INTO match_participants (match_id, user_id, clan_id, team)
    VALUES (v_match_id, v_player_id, p_loser_clan_id, 'loser');
  END LOOP;

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

  -- Update loser clan stats
  UPDATE clans
  SET
    matches_played = COALESCE(matches_played, 0) + 1,
    matches_lost = COALESCE(matches_lost, 0) + 1,
    current_win_streak = 0,
    current_loss_streak = v_new_loss_streak,
    updated_at = NOW()
  WHERE id = p_loser_clan_id;

  -- Update ALL winner warriors stats in ONE query
  UPDATE profiles
  SET
    warrior_points = COALESCE(warrior_points, 0) + v_points_awarded,
    warrior_wins = COALESCE(warrior_wins, 0) + 1,
    warrior_power_wins = COALESCE(warrior_power_wins, 0) + (CASE WHEN v_power_win THEN 1 ELSE 0 END),
    current_win_streak = COALESCE(current_win_streak, 0) + 1,
    current_loss_streak = 0,
    max_win_streak = GREATEST(COALESCE(max_win_streak, 0), COALESCE(current_win_streak, 0) + 1),
    updated_at = NOW()
  WHERE id = ANY(p_winner_player_ids);

  -- Update ALL loser warriors stats in ONE query
  UPDATE profiles
  SET
    warrior_losses = COALESCE(warrior_losses, 0) + 1,
    current_win_streak = 0,
    current_loss_streak = COALESCE(current_loss_streak, 0) + 1,
    updated_at = NOW()
  WHERE id = ANY(p_loser_player_ids);

  -- Return the created match with related data
  SELECT json_build_object(
    'id', m.id,
    'winner_clan_id', m.winner_clan_id,
    'loser_clan_id', m.loser_clan_id,
    'winner_score', m.winner_score,
    'loser_score', m.loser_score,
    'points_awarded', m.points_awarded,
    'power_win', m.power_win,
    'match_mode', m.match_mode,
    'created_at', m.created_at
  ) INTO v_result
  FROM matches m
  WHERE m.id = v_match_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION report_match TO authenticated;
