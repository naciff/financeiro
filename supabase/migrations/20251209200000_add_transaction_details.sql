
-- Add missing columns to transactions table
ALTER TABLE public.transactions 
  ADD COLUMN IF NOT EXISTS especie text,
  ADD COLUMN IF NOT EXISTS grupo_compromisso_id uuid REFERENCES public.commitment_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS compromisso_id uuid REFERENCES public.commitments(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_grupo_compromisso ON public.transactions(grupo_compromisso_id);
CREATE INDEX IF NOT EXISTS idx_transactions_compromisso ON public.transactions(compromisso_id);
