-- Allow authenticated users to search/read profiles
-- This is necessary to look up a user by email when inviting them to an organization

CREATE POLICY "Allow read all profiles for authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Also ensure RLS is enabled on profiles (it usually is, but good to ensure)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
