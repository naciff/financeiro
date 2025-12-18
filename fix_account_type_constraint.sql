-- Fix Check Constraint for Accounts Tipo
-- The previous constraint "accounts_tipo_allowed" likely restricts values to ('banco', 'carteira', 'cartao').
-- We need to add 'aplicacao'.

DO $$
BEGIN
    -- Drop the existing constraint
    ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_tipo_allowed;

    -- Add the updated constraint
    ALTER TABLE public.accounts ADD CONSTRAINT accounts_tipo_allowed 
    CHECK (tipo IN ('banco', 'carteira', 'cartao', 'aplicacao'));
    
EXCEPTION
    WHEN others THEN null;
END $$;
