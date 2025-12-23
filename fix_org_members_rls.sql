-- Comprehensive Fix for organization_members RLS policies (v2 - Non-Recursive)
-- Goal: Allow owners, admins, and the master user to manage organization memberships without infinite recursion.

-- 1. Create SECURITY DEFINER helper functions to bypass RLS recursion
-- These functions run as the owner (postgres) and can safely query the tables.

CREATE OR REPLACE FUNCTION public.get_my_org_ids()
RETURNS SETOF uuid AS $$
BEGIN
  RETURN QUERY
  SELECT organization_id
  FROM public.organization_members
  WHERE user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id uuid)
RETURNS boolean AS $$
DECLARE
    current_email text;
BEGIN
    -- Get email for Master User check
    current_email := auth.jwt() ->> 'email';
    IF current_email = 'ramon.naciff@gmail.com' THEN
        RETURN TRUE;
    END IF;

    RETURN (
        -- Check if user is the direct owner in public.organizations
        EXISTS (
            SELECT 1 FROM public.organizations 
            WHERE id = target_org_id AND owner_id = auth.uid()
        )
        OR
        -- Check if user has owner/admin role in public.organization_members
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = target_org_id 
            AND user_id = auth.uid() 
            AND role IN ('owner', 'admin')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop existing policies to apply clean ones
DROP POLICY IF EXISTS "Users can view their own membership" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can manage members of their orgs" ON public.organization_members;
DROP POLICY IF EXISTS "Members can view other members in the same organization" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can add members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can remove members" ON public.organization_members;
DROP POLICY IF EXISTS "Members can view their memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can manage their members" ON public.organization_members;
DROP POLICY IF EXISTS "Select organization members" ON public.organization_members;
DROP POLICY IF EXISTS "Manage organization members" ON public.organization_members;
DROP POLICY IF EXISTS "View Members" ON public.organization_members;
DROP POLICY IF EXISTS "Manage Members" ON public.organization_members;

-- 3. Create fixed SELECT policy
-- Any member of an organization can see other members of that same organization.
CREATE POLICY "Select organization members"
ON public.organization_members
FOR SELECT
USING (
    user_id = auth.uid() -- Always can see self
    OR
    organization_id IN (SELECT public.get_my_org_ids()) -- Member can see others in same org
    OR
    public.is_org_admin(organization_id) -- Admin/Owner/Ramon can see
);

-- 4. Create fixed MANAGE (Insert/Update/Delete) policy
-- Owners (table owners or 'owner'/'admin' role) and Master user can manage.
CREATE POLICY "Manage organization members"
ON public.organization_members
FOR ALL -- Covers INSERT, UPDATE, DELETE
USING (
    public.is_org_admin(organization_id)
)
WITH CHECK (
    public.is_org_admin(organization_id)
);

-- 5. Grant necessary permissions
GRANT ALL ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;
GRANT EXECUTE ON FUNCTION public.get_my_org_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
