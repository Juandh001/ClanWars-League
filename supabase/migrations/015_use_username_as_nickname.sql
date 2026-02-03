-- =============================================
-- MIGRATION 015: Use Discord Username as Nickname Priority
-- =============================================
-- Changes nickname priority to use username first, then global_name

-- Drop and recreate the function with new priority order
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_nickname TEXT;
BEGIN
  -- Extract nickname from Discord metadata with new priority:
  -- 1. username (unique Discord username)
  -- 2. global_name (display name)
  -- 3. email username (fallback)
  user_nickname := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'global_name',
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

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically creates a profile entry when a user signs up via Discord OAuth. Uses username as primary nickname source.';
