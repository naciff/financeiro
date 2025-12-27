-- Add 'ativo' column to commitment_groups and commitments
-- Defaults to true (ativo)
-- All existing records will be set to true

ALTER TABLE public.commitment_groups ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
ALTER TABLE public.commitments ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;

-- Set all existing records to TRUE
UPDATE public.commitment_groups SET ativo = TRUE WHERE ativo IS NULL;
UPDATE public.commitments SET ativo = TRUE WHERE ativo IS NULL;

-- Description of the change
COMMENT ON COLUMN public.commitment_groups.ativo IS 'Indica se o grupo de compromisso está ativo (true) ou inativo (false).';
COMMENT ON COLUMN public.commitments.ativo IS 'Indica se o compromisso está ativo (true) ou inativo (false).';
