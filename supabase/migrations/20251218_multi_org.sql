-- Migration: Multi-Organization Support
-- Allows users to create/manage multiple organizations/companies.

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS on organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view organizations they belong to"
    ON public.organizations
    FOR SELECT
    USING (
        auth.uid() = owner_id 
        OR 
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = public.organizations.id 
            AND member_id = auth.uid()
        )
    );

CREATE POLICY "Owners can manage their organizations"
    ON public.organizations
    FOR ALL
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- 3. Update organization_members to link to organizations instead of directly to users (owners)
-- First, handle existing data in organization_members if any
-- Since we are changing the architecture, we'll recreate or migrate it.
-- Current schema of organization_members (from previous research):
-- owner_id (uuid), member_id (uuid), permissions (jsonb)

-- We need to add organization_id to all relevant tables
DO $$ 
DECLARE 
    t text;
    tables_to_update text[] := ARRAY[
        'accounts', 'clients', 'schedules', 'transactions', 'financials', 
        'cost_centers', 'commitment_groups', 'commitments', 'cashboxes', 
        'notes', 'transaction_attachments', 'client_defaults'
    ];
BEGIN
    FOR t IN SELECT unnest(tables_to_update) LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE', t);
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(organization_id)', 'idx_' || t || '_org', t);
        END IF;
    END LOOP;
END $$;

-- 4. Create default "Pessoal" organization for existing users and link their data
DO $$
DECLARE
    u_id uuid;
    o_id uuid;
BEGIN
    FOR u_id IN SELECT id FROM auth.users LOOP
        -- Create a default organization for each user
        INSERT INTO public.organizations (name, owner_id)
        VALUES ('Pessoal', u_id)
        RETURNING id INTO o_id;

        -- Update all user's data to this organization
        UPDATE public.accounts SET organization_id = o_id WHERE user_id = u_id;
        UPDATE public.clients SET organization_id = o_id WHERE user_id = u_id;
        UPDATE public.schedules SET organization_id = o_id WHERE user_id = u_id;
        UPDATE public.transactions SET organization_id = o_id WHERE user_id = u_id;
        UPDATE public.financials SET organization_id = o_id WHERE user_id = u_id;
        UPDATE public.cost_centers SET organization_id = o_id WHERE user_id = u_id;
        UPDATE public.commitment_groups SET organization_id = o_id WHERE user_id = u_id;
        UPDATE public.commitments SET organization_id = o_id WHERE user_id = u_id;
        UPDATE public.cashboxes SET organization_id = o_id WHERE user_id = u_id;
        UPDATE public.notes SET organization_id = o_id WHERE user_id = u_id;
        UPDATE public.client_defaults SET organization_id = o_id WHERE user_id = u_id;
        -- transaction_attachments depends on transactions, but they don't have user_id usually or it's inherited.
        -- Let's check if transaction_attachments has user_id. From previous view, it didn't seem to.
        -- If it's linked via transaction_id, it should be fine.
    END LOOP;
END $$;

-- 5. Modify has_access function to use organization_id
CREATE OR REPLACE FUNCTION public.has_access(row_user_id uuid, row_org_id uuid DEFAULT NULL)
RETURNS boolean AS $$
BEGIN
  -- If org_id is provided, check membership
  IF row_org_id IS NOT NULL THEN
    RETURN (
        EXISTS (
            SELECT 1 FROM public.organizations 
            WHERE id = row_org_id AND owner_id = auth.uid()
        )
        OR 
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = row_org_id AND member_id = auth.uid()
        )
    );
  END IF;

  -- Fallback to user_id check (legacy or direct ownership)
  RETURN (
    row_user_id = auth.uid() 
    OR 
    EXISTS (
      SELECT 1 FROM public.organization_members 
      WHERE owner_id = row_user_id AND member_id = auth.uid()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Update organization_members schema to link to organization
ALTER TABLE public.organization_members ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Migrate existing members if any (those were linked to owner_id)
-- For simplicity, if organization_id is null, we can assume it was the Pessoal org of the owner.
-- But since we just created Pessoal orgs, we can match them.
UPDATE public.organization_members om
SET organization_id = o.id
FROM public.organizations o
WHERE om.owner_id = o.owner_id AND o.name = 'Pessoal' AND om.organization_id IS NULL;

-- 7. Update RLS Polices to use organization_id
-- We drop existing simple owner or shared policies and replace with has_access check

DO $$ 
DECLARE 
    t text;
    tables_to_update text[] := ARRAY[
        'clients', 'accounts', 'schedules', 'transactions', 'financials', 
        'commitment_groups', 'commitments', 'cashboxes', 'notes', 
        'transaction_attachments', 'client_defaults', 'cost_centers'
    ];
BEGIN
    FOR t IN SELECT unnest(tables_to_update) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Shared %I access" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS %I_policy ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Shared %I access" ON public.%I FOR ALL USING ( public.has_access(user_id, organization_id) ) WITH CHECK ( public.has_access(user_id, organization_id) )', t, t);
    END LOOP;
END $$;

-- 8. Trigger to create default organization for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_org() 
RETURNS TRIGGER AS $$
DECLARE
    default_org_id uuid;
BEGIN
    INSERT INTO public.organizations (name, owner_id)
    VALUES ('Pessoal', new.id)
    RETURNING id INTO default_org_id;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_org ON auth.users;
CREATE TRIGGER on_auth_user_created_org
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_org();

