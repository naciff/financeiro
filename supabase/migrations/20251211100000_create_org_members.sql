-- Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permissions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, member_id)
);

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Polices for organization_members
-- Owner can view/add/remove members of their own org
CREATE POLICY "Owners can manage their members"
  ON public.organization_members
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Members can view their own memberships (to know which orgs they belong to)
CREATE POLICY "Members can view their memberships"
  ON public.organization_members
  FOR SELECT
  USING (auth.uid() = member_id);

-- Helper function to check access
-- Returns true if row_user_id is the current user OR if current user is a member of row_user_id's org
CREATE OR REPLACE FUNCTION public.has_access(row_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN (
    row_user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE owner_id = row_user_id 
      AND member_id = auth.uid()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- UPDATE POLICIES FOR CORE TABLES
-- We need to drop existing simple owner policies and replace with has_access check

-- Clients
DROP POLICY IF EXISTS "Users can view own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON public.clients;

CREATE POLICY "Shared clients access" ON public.clients
  FOR ALL USING ( public.has_access(user_id) )
  WITH CHECK ( public.has_access(user_id) );

-- Accounts
DROP POLICY IF EXISTS "Users can view own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can insert own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can update own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can delete own accounts" ON public.accounts;

CREATE POLICY "Shared accounts access" ON public.accounts
  FOR ALL USING ( public.has_access(user_id) )
  WITH CHECK ( public.has_access(user_id) );

-- Schedules
DROP POLICY IF EXISTS "Users can view own schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can insert own schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can update own schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can delete own schedules" ON public.schedules;

CREATE POLICY "Shared schedules access" ON public.schedules
  FOR ALL USING ( public.has_access(user_id) )
  WITH CHECK ( public.has_access(user_id) );

-- Transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;

CREATE POLICY "Shared transactions access" ON public.transactions
  FOR ALL USING ( public.has_access(user_id) )
  WITH CHECK ( public.has_access(user_id) );

-- Financials (Ledger items)
DROP POLICY IF EXISTS "Users can view own financials" ON public.financials;
DROP POLICY IF EXISTS "Users can insert own financials" ON public.financials;
DROP POLICY IF EXISTS "Users can update own financials" ON public.financials;
DROP POLICY IF EXISTS "Users can delete own financials" ON public.financials;

CREATE POLICY "Shared financials access" ON public.financials
  FOR ALL USING ( public.has_access(user_id) )
  WITH CHECK ( public.has_access(user_id) );

-- Commitment Groups
DROP POLICY IF EXISTS "Users can view own commitment_groups" ON public.commitment_groups;
DROP POLICY IF EXISTS "Users can insert own commitment_groups" ON public.commitment_groups;
DROP POLICY IF EXISTS "Users can update own commitment_groups" ON public.commitment_groups;
DROP POLICY IF EXISTS "Users can delete own commitment_groups" ON public.commitment_groups;

CREATE POLICY "Shared commitment_groups access" ON public.commitment_groups
  FOR ALL USING ( public.has_access(user_id) )
  WITH CHECK ( public.has_access(user_id) );

-- Commitments
DROP POLICY IF EXISTS "Users can view own commitments" ON public.commitments;
DROP POLICY IF EXISTS "Users can insert own commitments" ON public.commitments;
DROP POLICY IF EXISTS "Users can update own commitments" ON public.commitments;
DROP POLICY IF EXISTS "Users can delete own commitments" ON public.commitments;

CREATE POLICY "Shared commitments access" ON public.commitments
  FOR ALL USING ( public.has_access(user_id) )
  WITH CHECK ( public.has_access(user_id) );


-- Cashboxes
DROP POLICY IF EXISTS "Users can view own cashboxes" ON public.cashboxes;
DROP POLICY IF EXISTS "Users can insert own cashboxes" ON public.cashboxes;
DROP POLICY IF EXISTS "Users can update own cashboxes" ON public.cashboxes;
DROP POLICY IF EXISTS "Users can delete own cashboxes" ON public.cashboxes;

CREATE POLICY "Shared cashboxes access" ON public.cashboxes
  FOR ALL USING ( public.has_access(user_id) )
  WITH CHECK ( public.has_access(user_id) );
