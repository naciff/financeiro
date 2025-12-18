-- Fix Infinite Recursion in RLS

-- 1. Create a helper function to check ownership securely (bypassing RLS tables)
CREATE OR REPLACE FUNCTION public.is_org_owner(org_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = org_id
    AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update organization_members policies to use the function instead of querying organizations directly

-- SELECT: Self, Owner, or Fellow Member
DROP POLICY IF EXISTS "Members can view other members in the same organization" ON public.organization_members;
CREATE POLICY "Members can view other members in the same organization"
  ON public.organization_members FOR SELECT
  USING (
    auth.uid() = user_id -- 1. Can see self
    OR
    public.is_org_owner(organization_id) -- 2. Owner (via secure function)
    OR
    EXISTS ( -- 3. Fellow member (recursion bounded by 'user_id = auth.uid()' base case)
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- INSERT: Only Owner
DROP POLICY IF EXISTS "Owners can add members" ON public.organization_members;
CREATE POLICY "Owners can add members"
  ON public.organization_members FOR INSERT
  WITH CHECK (
    public.is_org_owner(organization_id)
  );

-- DELETE: Only Owner
DROP POLICY IF EXISTS "Owners can remove members" ON public.organization_members;
CREATE POLICY "Owners can remove members"
  ON public.organization_members FOR DELETE
  USING (
    public.is_org_owner(organization_id)
  );

-- UPDATE: Only Owner
-- (Optional, if we want to allow updating permissions later)
DROP POLICY IF EXISTS "Owners can update members" ON public.organization_members;
CREATE POLICY "Owners can update members"
  ON public.organization_members FOR UPDATE
  USING (
    public.is_org_owner(organization_id)
  );
