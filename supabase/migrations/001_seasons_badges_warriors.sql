-- ClanWars League - Migration 001: Seasons, Badges, and Warrior Stats
-- Run this in your Supabase SQL Editor AFTER the initial schema

-- ============================================
-- PART 1: NEW ENUM TYPES
-- ============================================

CREATE TYPE badge_type AS ENUM ('gold', 'silver', 'bronze');
CREATE TYPE badge_category AS ENUM ('clan', 'warrior');

-- ============================================
-- PART 2: NEW TABLES
-- ============================================

-- Seasons table
CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    number INTEGER NOT NULL UNIQUE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seasons_active ON seasons(is_active);
CREATE INDEX idx_seasons_number ON seasons(number DESC);

-- Season Clan Stats (snapshot at end of each season)
CREATE TABLE season_clan_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    final_rank INTEGER NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    power_wins INTEGER NOT NULL DEFAULT 0,
    matches_played INTEGER NOT NULL DEFAULT 0,
    matches_won INTEGER NOT NULL DEFAULT 0,
    matches_lost INTEGER NOT NULL DEFAULT 0,
    max_win_streak INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(season_id, clan_id)
);

CREATE INDEX idx_season_clan_stats_season ON season_clan_stats(season_id);
CREATE INDEX idx_season_clan_stats_rank ON season_clan_stats(season_id, final_rank);

-- Season Warrior Stats (snapshot at end of each season)
CREATE TABLE season_warrior_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    clan_id UUID REFERENCES clans(id) ON DELETE SET NULL,
    final_rank INTEGER NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    power_wins INTEGER NOT NULL DEFAULT 0,
    matches_played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    max_win_streak INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(season_id, user_id)
);

CREATE INDEX idx_season_warrior_stats_season ON season_warrior_stats(season_id);
CREATE INDEX idx_season_warrior_stats_rank ON season_warrior_stats(season_id, final_rank);

-- Badges/Achievements table
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    season_id UUID NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    category badge_category NOT NULL,
    badge_type badge_type NOT NULL,
    rank INTEGER NOT NULL,
    awarded_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(season_id, target_id, category)
);

CREATE INDEX idx_badges_target ON badges(target_id);
CREATE INDEX idx_badges_season ON badges(season_id);
CREATE INDEX idx_badges_category ON badges(category);

-- ============================================
-- PART 3: ALTER EXISTING TABLES
-- ============================================

-- Add streak columns to clans
ALTER TABLE clans ADD COLUMN IF NOT EXISTS current_win_streak INTEGER DEFAULT 0;
ALTER TABLE clans ADD COLUMN IF NOT EXISTS current_loss_streak INTEGER DEFAULT 0;
ALTER TABLE clans ADD COLUMN IF NOT EXISTS max_win_streak INTEGER DEFAULT 0;

-- Add warrior stats columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warrior_points INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warrior_wins INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warrior_losses INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warrior_power_wins INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_win_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_loss_streak INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_win_streak INTEGER DEFAULT 0;

-- Add season_id to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES seasons(id);
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season_id);

-- Additional indexes for warrior rankings
CREATE INDEX IF NOT EXISTS idx_profiles_warrior_points ON profiles(warrior_points DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON profiles(last_seen DESC);

-- ============================================
-- PART 4: ROW LEVEL SECURITY
-- ============================================

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_clan_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE season_warrior_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

-- Seasons policies
CREATE POLICY "Seasons are viewable by everyone"
    ON seasons FOR SELECT USING (true);

CREATE POLICY "Only admins can manage seasons"
    ON seasons FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Season clan stats policies
CREATE POLICY "Season clan stats are viewable by everyone"
    ON season_clan_stats FOR SELECT USING (true);

CREATE POLICY "Only admins can manage season clan stats"
    ON season_clan_stats FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Season warrior stats policies
CREATE POLICY "Season warrior stats are viewable by everyone"
    ON season_warrior_stats FOR SELECT USING (true);

CREATE POLICY "Only admins can manage season warrior stats"
    ON season_warrior_stats FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Badges policies
CREATE POLICY "Badges are viewable by everyone"
    ON badges FOR SELECT USING (true);

CREATE POLICY "Only admins can manage badges"
    ON badges FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- PART 5: FUNCTIONS AND TRIGGERS
-- ============================================

-- Function: Update clan streaks after a match
CREATE OR REPLACE FUNCTION update_clan_streaks()
RETURNS TRIGGER AS $$
BEGIN
    -- Update winner streaks
    UPDATE clans
    SET
        current_win_streak = current_win_streak + 1,
        current_loss_streak = 0,
        max_win_streak = GREATEST(max_win_streak, current_win_streak + 1)
    WHERE id = NEW.winner_clan_id;

    -- Update loser streaks
    UPDATE clans
    SET
        current_win_streak = 0,
        current_loss_streak = current_loss_streak + 1
    WHERE id = NEW.loser_clan_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for clan streaks
DROP TRIGGER IF EXISTS trigger_update_clan_streaks ON matches;
CREATE TRIGGER trigger_update_clan_streaks
    AFTER INSERT ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_clan_streaks();

-- Function: Update warrior stats after a match
CREATE OR REPLACE FUNCTION update_warrior_stats_on_match()
RETURNS TRIGGER AS $$
DECLARE
    points_earned INTEGER;
BEGIN
    -- Calculate points
    points_earned := CASE WHEN NEW.power_win THEN 4 ELSE 3 END;

    -- Update all members of winning clan
    UPDATE profiles p
    SET
        warrior_wins = warrior_wins + 1,
        warrior_points = warrior_points + points_earned,
        warrior_power_wins = warrior_power_wins + CASE WHEN NEW.power_win THEN 1 ELSE 0 END,
        current_win_streak = current_win_streak + 1,
        current_loss_streak = 0,
        max_win_streak = GREATEST(max_win_streak, current_win_streak + 1)
    FROM clan_members cm
    WHERE cm.user_id = p.id AND cm.clan_id = NEW.winner_clan_id;

    -- Update all members of losing clan
    UPDATE profiles p
    SET
        warrior_losses = warrior_losses + 1,
        current_win_streak = 0,
        current_loss_streak = current_loss_streak + 1
    FROM clan_members cm
    WHERE cm.user_id = p.id AND cm.clan_id = NEW.loser_clan_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for warrior stats
DROP TRIGGER IF EXISTS trigger_update_warrior_stats ON matches;
CREATE TRIGGER trigger_update_warrior_stats
    AFTER INSERT ON matches
    FOR EACH ROW
    EXECUTE FUNCTION update_warrior_stats_on_match();

-- Function: Close a season and award badges
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

-- Function: Start a new season
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
    -- WHERE true is required by Supabase to allow mass updates
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
    -- WHERE true is required by Supabase to allow mass updates
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

-- ============================================
-- PART 6: REALTIME SUBSCRIPTIONS
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE seasons;
ALTER PUBLICATION supabase_realtime ADD TABLE badges;

-- ============================================
-- PART 7: INITIALIZE FIRST SEASON
-- ============================================

-- Create Season 1 (active)
INSERT INTO seasons (name, number, start_date, end_date, is_active)
VALUES ('Season 1', 1, NOW(), NOW() + INTERVAL '30 days', true)
ON CONFLICT DO NOTHING;

-- Associate existing matches with Season 1
UPDATE matches
SET season_id = (SELECT id FROM seasons WHERE number = 1)
WHERE season_id IS NULL;
