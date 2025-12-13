-- FIX PERMISSIONS FOR ORGANIZATION MEMBERS access
-- This migration ensures members can see their own memberships and the owner profile info

-- 1. Ensure Profiles are readable by all authenticated users (so members can see owner name)
DROP POLICY IF EXISTS "Allow read all profiles for authenticated users" ON public.profiles;
CREATE POLICY "Allow read all profiles for authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- 2. Ensure Organization Members can see their own rows
DROP POLICY IF EXISTS "Members can view their memberships" ON public.organization_members;
CREATE POLICY "Members can view their memberships"
  ON public.organization_members
  FOR SELECT
  USING (auth.uid() = member_id);

-- 3. Ensure Organization Members can also see rows where they are OWNER (if not already covered)
DROP POLICY IF EXISTS "Owners can manage their members" ON public.organization_members;
CREATE POLICY "Owners can manage their members"
  ON public.organization_members
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 4. Grant access to 'authenticated' role just in case
GRANT SELECT ON public.organization_members TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
