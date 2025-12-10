
-- Add columns to accounts table
ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS banco_codigo text,
  ADD COLUMN IF NOT EXISTS agencia text,
  ADD COLUMN IF NOT EXISTS conta text,
  ADD COLUMN IF NOT EXISTS dia_vencimento integer,
  ADD COLUMN IF NOT EXISTS cor text DEFAULT '#000000';

-- Force types to TEXT to avoid 'character varying(7)' limits if columns already existed with limits
ALTER TABLE public.accounts ALTER COLUMN banco_codigo TYPE text;
ALTER TABLE public.accounts ALTER COLUMN agencia TYPE text;
ALTER TABLE public.accounts ALTER COLUMN conta TYPE text;
ALTER TABLE public.accounts ALTER COLUMN cor TYPE text;

-- Drop legacy check constraints that might enforce lengths or formats (e.g. 5 digits)
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_agencia_fmt;
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_conta_fmt;
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_banco_codigo_fmt;

-- Handle principal column specifically to ensure it is boolean
-- (Dropping first to fix potential type mismatch if it exists as bit from truncated run)
ALTER TABLE public.accounts DROP COLUMN IF EXISTS principal;
ALTER TABLE public.accounts ADD COLUMN principal boolean DEFAULT false;

-- Add index for principal account
CREATE INDEX IF NOT EXISTS idx_accounts_principal ON public.accounts(principal) WHERE principal = true;
