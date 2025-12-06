ALTER TABLE public.commitment_groups ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE public.commitment_groups ADD CONSTRAINT commitment_groups_tipo_allowed CHECK (tipo IN ('receita','despesa','aporte','retirada'));
UPDATE public.commitment_groups SET tipo = COALESCE(tipo, operacao);
