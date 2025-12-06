ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_accounts_ativo ON public.accounts(ativo);
