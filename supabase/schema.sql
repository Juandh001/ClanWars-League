-- ClanWars League Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE clan_role AS ENUM ('captain', 'member');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'rejected', 'expired');

-- Profiles table (linked to Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    nickname TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clans table
CREATE TABLE clans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    tag TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    description TEXT,
    captain_id UUID NOT NULL REFERENCES profiles(id),
    points INTEGER DEFAULT 0,
    power_wins INTEGER DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    matches_won INTEGER DEFAULT 0,
    matches_lost INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clan members table
CREATE TABLE clan_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role clan_role DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clan_id, user_id),
    UNIQUE(user_id) -- A user can only be in one clan
);

-- Clan invitations table
CREATE TABLE clan_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clan_id UUID NOT NULL REFERENCES clans(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES profiles(id),
    status invitation_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    winner_clan_id UUID NOT NULL REFERENCES clans(id),
    loser_clan_id UUID NOT NULL REFERENCES clans(id),
    reported_by UUID NOT NULL REFERENCES profiles(id),
    winner_score INTEGER DEFAULT 0,
    loser_score INTEGER DEFAULT 0,
    points_awarded INTEGER DEFAULT 3,
    power_win BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT different_clans CHECK (winner_clan_id != loser_clan_id)
);

-- Admin actions log
CREATE TABLE admin_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES profiles(id),
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_nickname ON profiles(nickname);
CREATE INDEX idx_profiles_is_online ON profiles(is_online);
CREATE INDEX idx_clans_points ON clans(points DESC);
CREATE INDEX idx_clans_tag ON clans(tag);
CREATE INDEX idx_clan_members_clan_id ON clan_members(clan_id);
CREATE INDEX idx_clan_members_user_id ON clan_members(user_id);
CREATE INDEX idx_clan_invitations_email ON clan_invitations(email);
CREATE INDEX idx_clan_invitations_status ON clan_invitations(status);
CREATE INDEX idx_matches_winner ON matches(winner_clan_id);
CREATE INDEX idx_matches_loser ON matches(loser_clan_id);
CREATE INDEX idx_matches_created_at ON matches(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clans_updated_at
    BEFORE UPDATE ON clans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update clan stats on win
CREATE OR REPLACE FUNCTION update_clan_stats_win(
    clan_id_param UUID,
    points_to_add INTEGER,
    is_power_win BOOLEAN
)
RETURNS VOID AS $$
BEGIN
    UPDATE clans
    SET
        points = points + points_to_add,
        power_wins = power_wins + CASE WHEN is_power_win THEN 1 ELSE 0 END,
        matches_played = matches_played + 1,
        matches_won = matches_won + 1
    WHERE id = clan_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to update clan stats on loss
CREATE OR REPLACE FUNCTION update_clan_stats_loss(clan_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE clans
    SET
        matches_played = matches_played + 1,
        matches_lost = matches_lost + 1
    WHERE id = clan_id_param;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE clan_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Service role can manage all profiles (for registration)
CREATE POLICY "Service role can manage profiles"
    ON profiles FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Allow authenticated users to insert their own profile during signup
CREATE POLICY "Enable insert for authenticated users during signup"
    ON profiles FOR INSERT
    WITH CHECK (true);

-- Clans policies
CREATE POLICY "Clans are viewable by everyone"
    ON clans FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create clans"
    ON clans FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Captain can update clan"
    ON clans FOR UPDATE
    USING (auth.uid() = captain_id OR
           EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admin can delete clans"
    ON clans FOR DELETE
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Clan members policies
CREATE POLICY "Clan members are viewable by everyone"
    ON clan_members FOR SELECT
    USING (true);

CREATE POLICY "Captains can manage clan members"
    ON clan_members FOR ALL
    USING (
        EXISTS (SELECT 1 FROM clans WHERE id = clan_id AND captain_id = auth.uid()) OR
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Clan invitations policies
CREATE POLICY "Users can view invitations for their email"
    ON clan_invitations FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND LOWER(email) = LOWER(clan_invitations.email)) OR
        EXISTS (SELECT 1 FROM clans WHERE id = clan_id AND captain_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Captains can create invitations"
    ON clan_invitations FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM clans WHERE id = clan_id AND captain_id = auth.uid()));

CREATE POLICY "Users can update invitations for their email"
    ON clan_invitations FOR UPDATE
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND LOWER(email) = LOWER(clan_invitations.email)));

-- Matches policies
CREATE POLICY "Matches are viewable by everyone"
    ON matches FOR SELECT
    USING (true);

CREATE POLICY "Clan members can report losses"
    ON matches FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM clan_members
            WHERE user_id = auth.uid()
            AND clan_id = loser_clan_id
        )
    );

-- Admin actions policies
CREATE POLICY "Only admins can view action logs"
    ON admin_actions FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Only admins can create action logs"
    ON admin_actions FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Realtime subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE clans;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- Create first admin user (run this AFTER creating your first user account)
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin-email@example.com';
