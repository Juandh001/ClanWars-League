-- =============================================
-- MIGRATION 013: Discord OAuth Auto-Create Profile
-- =============================================
-- Automatically creates a profile when a user signs up with Discord OAuth

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_nickname TEXT;
BEGIN
  -- Extract nickname from Discord metadata, fallback to email username
  user_nickname := COALESCE(
    NEW.raw_user_meta_data->>'global_name',
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  -- Ensure nickname is unique by appending numbers if needed
  WHILE EXISTS (SELECT 1 FROM profiles WHERE nickname = user_nickname) LOOP
    user_nickname := user_nickname || floor(random() * 1000)::text;
  END LOOP;

  -- Insert new profile
  INSERT INTO public.profiles (
    id,
    email,
    nickname,
    avatar_url,
    role,
    is_online,
    last_seen
  )
  VALUES (
    NEW.id,
    NEW.email,
    user_nickname,
    NEW.raw_user_meta_data->>'avatar_url',
    'user',
    true,
    NOW()
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger that fires when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates a profile entry when a user signs up via Discord OAuth';
