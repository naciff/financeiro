-- Fix Accounts RLS Policies
-- The error "column owner_id does not exist" on Accounts page indicates a bad policy on the 'accounts' table.
-- This script removes old/bad policies and applies the correct one using 'has_access'.

-- 1. Drop known or potential bad policies on 'accounts'
DROP POLICY IF EXISTS "p_accounts_owner" ON public.accounts;
DROP POLICY IF EXISTS "Shared accounts access" ON public.accounts;
DROP POLICY IF EXISTS "accounts_policy" ON public.accounts;
DROP POLICY IF EXISTS "Owners can manage accounts" ON public.accounts;

-- 2. Create the correct policy using has_access
-- This allows access if user owns the organization OR is a member with access.
CREATE POLICY "Shared accounts access"
ON public.accounts
FOR ALL
USING ( public.has_access(user_id, organization_id) )
WITH CHECK ( public.has_access(user_id, organization_id) );

-- 3. Just in case cost_centers or cashboxes have similar issues, fix them too (they are loaded on Accounts page usually)
DROP POLICY IF EXISTS "p_cashboxes_owner" ON public.cashboxes;
DROP POLICY IF EXISTS "Shared cashboxes access" ON public.cashboxes;
CREATE POLICY "Shared cashboxes access" ON public.cashboxes FOR ALL USING ( public.has_access(user_id, organization_id) ) WITH CHECK ( public.has_access(user_id, organization_id) );

DROP POLICY IF EXISTS "p_cost_centers_owner" ON public.cost_centers;
DROP POLICY IF EXISTS "Shared cost_centers access" ON public.cost_centers;
CREATE POLICY "Shared cost_centers access" ON public.cost_centers FOR ALL USING ( public.has_access(user_id, organization_id) ) WITH CHECK ( public.has_access(user_id, organization_id) );

DO $$
BEGIN
    RAISE NOTICE 'Fixed RLS policies on accounts, cashboxes, and cost_centers.';
END $$;
