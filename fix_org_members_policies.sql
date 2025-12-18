-- Fix Organization Members Policies
-- The previous script 'fix_permissions.sql' added policies referencing 'owner_id' and 'member_id',
-- which do not exist on the 'organization_members' table (it uses 'user_id' and 'organization_id').
-- This script removes those broken policies and adds correct ones.

-- 1. Drop broken policies
DROP POLICY IF EXISTS "Members can view their memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can manage their members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.organization_members;

-- 2. Create correct policies

-- Allow users to see their own membership rows
CREATE POLICY "Users can view their own membership"
ON public.organization_members
FOR SELECT
USING (auth.uid() = user_id);

-- Allow organization owners to view/manage members of their organizations
CREATE POLICY "Owners can manage members of their orgs"
ON public.organization_members
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.id = organization_members.organization_id
        AND o.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organizations o
        WHERE o.id = organization_members.organization_id
        AND o.owner_id = auth.uid()
    )
);

-- 3. Verify columns (optional notice)
DO $$
BEGIN
    RAISE NOTICE 'Fixed policies on organization_members. Columns used: user_id, organization_id.';
END $$;
