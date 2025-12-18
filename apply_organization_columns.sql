-- Explicitly create organizations table and add columns
-- Run this script in your Supabase SQL Editor to fix the "column organization_id does not exist" error.

-- 1. Create organizations table if not exists
CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Add organization_id to all tables
DO $$
BEGIN
    -- accounts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'organization_id') THEN
        ALTER TABLE public.accounts ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- clients
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clients' AND column_name = 'organization_id') THEN
        ALTER TABLE public.clients ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- schedules
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'organization_id') THEN
        ALTER TABLE public.schedules ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- transactions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'organization_id') THEN
        ALTER TABLE public.transactions ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- financials
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financials' AND column_name = 'organization_id') THEN
        ALTER TABLE public.financials ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- cost_centers
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cost_centers' AND column_name = 'organization_id') THEN
        ALTER TABLE public.cost_centers ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- commitment_groups
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commitment_groups' AND column_name = 'organization_id') THEN
        ALTER TABLE public.commitment_groups ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- commitments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'commitments' AND column_name = 'organization_id') THEN
        ALTER TABLE public.commitments ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- cashboxes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cashboxes' AND column_name = 'organization_id') THEN
        ALTER TABLE public.cashboxes ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- notes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notes' AND column_name = 'organization_id') THEN
        ALTER TABLE public.notes ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
    
    -- transaction_attachments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transaction_attachments' AND column_name = 'organization_id') THEN
        ALTER TABLE public.transaction_attachments ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;

    -- client_defaults (if exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_defaults') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_defaults' AND column_name = 'organization_id') THEN
            ALTER TABLE public.client_defaults ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;
        END IF;
    END IF;

END $$;

-- 4. Create default organization for existing users and backfill data
DO $$
DECLARE
    u record;
    o_id uuid;
BEGIN
    FOR u IN SELECT id FROM auth.users LOOP
        -- Check if user already has an org ownership
        SELECT id INTO o_id FROM public.organizations WHERE owner_id = u.id AND name = 'Pessoal' LIMIT 1;
        
        IF o_id IS NULL THEN
            INSERT INTO public.organizations (name, owner_id) VALUES ('Pessoal', u.id) RETURNING id INTO o_id;
        END IF;

        -- Update null organization_ids
        UPDATE public.accounts SET organization_id = o_id WHERE user_id = u.id AND organization_id IS NULL;
        UPDATE public.clients SET organization_id = o_id WHERE user_id = u.id AND organization_id IS NULL;
        UPDATE public.schedules SET organization_id = o_id WHERE user_id = u.id AND organization_id IS NULL;
        UPDATE public.transactions SET organization_id = o_id WHERE user_id = u.id AND organization_id IS NULL;
        UPDATE public.financials SET organization_id = o_id WHERE user_id = u.id AND organization_id IS NULL;
        UPDATE public.cost_centers SET organization_id = o_id WHERE user_id = u.id AND organization_id IS NULL;
        UPDATE public.commitment_groups SET organization_id = o_id WHERE user_id = u.id AND organization_id IS NULL;
        UPDATE public.commitments SET organization_id = o_id WHERE user_id = u.id AND organization_id IS NULL;
        UPDATE public.cashboxes SET organization_id = o_id WHERE user_id = u.id AND organization_id IS NULL;
        UPDATE public.notes SET organization_id = o_id WHERE user_id = u.id AND organization_id IS NULL;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_defaults') THEN
             UPDATE public.client_defaults SET organization_id = o_id WHERE user_id = u.id AND organization_id IS NULL;
        END IF;
    END LOOP;
END $$;
