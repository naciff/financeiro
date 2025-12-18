-- 1. Add last_login column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- 2. Create a function to sync auth.users.last_sign_in_at to public.profiles.last_login
CREATE OR REPLACE FUNCTION public.sync_last_login()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the profile's last_login when auth.users.last_sign_in_at changes
  UPDATE public.profiles
  SET last_login = NEW.last_sign_in_at
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger on auth.users
-- Note: We need to drop it first if it exists to avoid errors on re-run
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;

CREATE TRIGGER on_auth_user_login
AFTER UPDATE OF last_sign_in_at ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_last_login();

-- 4. Initial Backfill (Optional, for existing users who have signed in)
-- This might fail if we don't have permissions to read auth.users directly in this script context 
-- depending on how it's run, but for a Super Admin / SQL Editor execution it works.
DO $$
BEGIN
  UPDATE public.profiles p
  SET last_login = u.last_sign_in_at
  FROM auth.users u
  WHERE p.id = u.id
  AND p.last_login IS NULL;
EXCEPTION
  WHEN OTHERS THEN NULL; -- Ignore errors if auth.users is not accessible
END $$;
