-- =============================================
-- MIGRATION 002: Match Modes & Participants
-- =============================================

-- 1. Add match_mode enum
CREATE TYPE match_mode AS ENUM ('1v1', '2v2', '3v3', '4v4', '5v5', '6v6');

-- 2. Add new columns to matches table
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS match_mode match_mode DEFAULT '5v5',
ADD COLUMN IF NOT EXISTS power_points_bonus INTEGER DEFAULT 0;

-- 3. Create match_participants table
CREATE TABLE IF NOT EXISTS match_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    team TEXT NOT NULL CHECK (team IN ('winner', 'loser')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(match_id, user_id)
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_participants_match ON match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_user ON match_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_clan ON match_participants(clan_id);

-- 5. RLS Policies for match_participants
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;

-- Everyone can read match participants
CREATE POLICY "Match participants are viewable by everyone"
    ON match_participants FOR SELECT
    USING (true);

-- Only clan members can insert their own participation
CREATE POLICY "Clan members can record match participation"
    ON match_participants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM clan_members
            WHERE clan_members.user_id = auth.uid()
            AND clan_members.clan_id = match_participants.clan_id
        )
    );

-- 6. Function to calculate Power Points based on opponent ranking
CREATE OR REPLACE FUNCTION calculate_power_points(
    winner_points INTEGER,
    loser_points INTEGER,
    score_difference INTEGER
) RETURNS INTEGER AS $$
DECLARE
    base_points INTEGER := 3;
    ranking_bonus INTEGER := 0;
    score_bonus INTEGER := 0;
    total_bonus INTEGER := 0;
BEGIN
    -- Ranking-based bonus: If winner has fewer points than loser, they get bonus
    -- This rewards "giant killing" - when a weaker team beats a stronger team
    IF loser_points > winner_points THEN
        -- Calculate bonus based on point difference (capped at 5)
        ranking_bonus := LEAST(FLOOR((loser_points - winner_points) / 10.0), 5);
    END IF;

    -- Score difference bonus (power win)
    IF score_difference >= 5 THEN
        score_bonus := 1;
    END IF;

    total_bonus := ranking_bonus + score_bonus;

    RETURN total_bonus;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to update warrior stats when they participate in a match
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
        -- Winner gets points
        points_to_add := CASE WHEN is_power_win THEN 4 ELSE 3 END;

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

-- 8. Create trigger for warrior stats update
DROP TRIGGER IF EXISTS trigger_update_warrior_stats ON match_participants;
CREATE TRIGGER trigger_update_warrior_stats
    AFTER INSERT ON match_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_warrior_stats_from_participation();

-- 9. Helper function to get players per team based on match mode
CREATE OR REPLACE FUNCTION get_players_per_team(mode match_mode)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE mode
        WHEN '1v1' THEN 1
        WHEN '2v2' THEN 2
        WHEN '3v3' THEN 3
        WHEN '4v4' THEN 4
        WHEN '5v5' THEN 5
        WHEN '6v6' THEN 6
    END;
END;
$$ LANGUAGE plpgsql;
