ALTER TABLE public.commitment_groups ADD COLUMN IF NOT EXISTS operacao text;
ALTER TABLE public.commitment_groups ADD CONSTRAINT commitment_groups_operacao_chk CHECK (operacao = ANY (ARRAY['receita','despesa','aporte','retirada']));
