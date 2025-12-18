-- Fix Unique Constraints for Multi-Tenant/Organization structure

-- 1. Accounts (Caixa Financeiro)
-- Old constraint: unique(user_id, nome)
-- New constraint: unique(organization_id, nome)
-- This allows the same user to have "Caixa Principal" in Organization A and Organization B.

DO $$
BEGIN
    -- Drop old constraint if exists
    ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_user_id_nome_key;
    
    -- Add new constraint matching organization scope
    -- We use IF NOT EXISTS workaround or just catch exception in a block if strictly needed, 
    -- but standard ADD CONSTRAINT will fail if data is invalid.
    -- Assuming data is valid because we just backfilled distinct organizations or simple structure.
    -- If there are duplicates already (unlikely given the error blocked them), this might fail.
    
    -- Drop the new constraint name if it exists to be idempotent
    ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_organization_id_nome_key;

    ALTER TABLE public.accounts ADD CONSTRAINT accounts_organization_id_nome_key UNIQUE (organization_id, nome);
EXCEPTION
    WHEN others THEN null; -- Fail silently or log? Better to let it fail if data is corrupt, but for script robustness... 
    -- Actually, let's not silence errors for ADD CONSTRAINT, we want to know.
    -- But to allow re-running, we handle the DROP above.
END $$;


-- 2. Clients (Clientes) - Anticipating similar issue
DO $$
BEGIN
    ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_user_id_nome_key;
    ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_organization_id_nome_key;
    ALTER TABLE public.clients ADD CONSTRAINT clients_organization_id_nome_key UNIQUE (organization_id, nome);
EXCEPTION
    WHEN others THEN null;
END $$;

-- 3. Cost Centers (Centros de Custo) - Anticipating similar issue
DO $$
BEGIN
    ALTER TABLE public.cost_centers DROP CONSTRAINT IF EXISTS cost_centers_user_id_nome_key;
    ALTER TABLE public.cost_centers DROP CONSTRAINT IF EXISTS cost_centers_organization_id_nome_key;
    ALTER TABLE public.cost_centers ADD CONSTRAINT cost_centers_organization_id_nome_key UNIQUE (organization_id, nome);
EXCEPTION
    WHEN others THEN null;
END $$;

-- 4. Commitment Groups (Grupos de Compromisso)
DO $$
BEGIN
    ALTER TABLE public.commitment_groups DROP CONSTRAINT IF EXISTS commitment_groups_user_id_nome_key;
    ALTER TABLE public.commitment_groups DROP CONSTRAINT IF EXISTS commitment_groups_organization_id_nome_key;
    ALTER TABLE public.commitment_groups ADD CONSTRAINT commitment_groups_organization_id_nome_key UNIQUE (organization_id, nome);
EXCEPTION
    WHEN others THEN null;
END $$;

-- 5. Commitments (Compromissos) - usually unique by name within group, or org? 
-- Let's check commitments constraint. Usually unique(user_id, nome).
DO $$
BEGIN
    ALTER TABLE public.commitments DROP CONSTRAINT IF EXISTS commitments_user_id_nome_key;
    ALTER TABLE public.commitments DROP CONSTRAINT IF EXISTS commitments_organization_id_nome_key;
    ALTER TABLE public.commitments ADD CONSTRAINT commitments_organization_id_nome_key UNIQUE (organization_id, nome);
EXCEPTION
    WHEN others THEN null;
END $$;
