-- Allow specific users (Admins) or ALL authenticated users (if simple) to view all profiles
-- Currently, user might only see their own profile or profiles of org members.

-- OPTION 1: Allow ALL authenticated users to read ALL profiles (Simpler for "Admin" feature if we don't have a role system yet)
-- This allows anyone logged in to see the list of users if they have the UI.
DROP POLICY IF EXISTS "Allow read all profiles for authenticated users" ON public.profiles;

CREATE POLICY "Allow read all profiles for authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Ensure profiles table has created_at if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Grant usage on profiles to authenticated
GRANT SELECT ON public.profiles TO authenticated;

NOTIFY pgrst, 'reload config';
