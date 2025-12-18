-- FINAL FIX FOR RLS RECURSION
-- We will replace direct table queries in policies with SECURITY DEFINER functions.
-- This ensures that checking a policy does not trigger another RLS check, breaking the cycle.

-- 1. Function to get all organization IDs the current user belongs to
-- Bypasses RLS on organization_members to avoid recursion
CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to check if current user is owner of an organization
-- Bypasses RLS on organizations to avoid recursion
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


-- 3. RESET & RECREATE POLICIES FOR 'organization_members'
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Members can view other members in the same organization" ON public.organization_members;
    DROP POLICY IF EXISTS "Owners can add members" ON public.organization_members;
    DROP POLICY IF EXISTS "Owners can remove members" ON public.organization_members;
    DROP POLICY IF EXISTS "Owners can update members" ON public.organization_members;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Policy: View Members
-- Logic: I can see a row if it's ME, or if it's in an org I OWN, or if it's in an org I'm a MEMBER of.
CREATE POLICY "View Members"
  ON public.organization_members FOR SELECT
  USING (
    user_id = auth.uid() -- It's me
    OR
    public.is_org_owner(organization_id) -- I own the org
    OR
    organization_id IN (SELECT public.get_my_org_ids()) -- I am a member of the org
  );

-- Policy: Manage Members (Insert/Delete/Update) - Only Owners
CREATE POLICY "Manage Members"
  ON public.organization_members FOR ALL
  USING (
    public.is_org_owner(organization_id)
  )
  WITH CHECK (
    public.is_org_owner(organization_id)
  );


-- 4. RESET & RECREATE POLICIES FOR 'organizations'
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
    DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
    DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
    DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Policy: Create (Insert)
CREATE POLICY "Create Organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Policy: View (Select)
-- Logic: I can see an org if I OWN it, or if I am a MEMBER of it.
CREATE POLICY "View Organizations"
  ON public.organizations FOR SELECT
  USING (
    auth.uid() = owner_id
    OR
    id IN (SELECT public.get_my_org_ids())
  );

-- Policy: Update/Delete - Only Owners
CREATE POLICY "Manage Organizations"
  ON public.organizations FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Delete Organizations"
  ON public.organizations FOR DELETE
  USING (auth.uid() = owner_id);
