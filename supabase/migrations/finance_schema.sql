-- Finance schema migration
-- 1) Enable extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2) Core tables
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  documento text,
  email text,
  telefone text,
  razao_social text,
  endereco text,
  atividade_principal text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_clients_user ON public.clients(user_id);

CREATE TABLE IF NOT EXISTS public.commitment_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
CREATE INDEX IF NOT EXISTS idx_commitment_groups_user ON public.commitment_groups(user_id);

CREATE TABLE IF NOT EXISTS public.commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  grupo_id uuid NOT NULL REFERENCES public.commitment_groups(id) ON DELETE CASCADE,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grupo_id, nome)
);
CREATE INDEX IF NOT EXISTS idx_commitments_user ON public.commitments(user_id);

CREATE TABLE IF NOT EXISTS public.cashboxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
CREATE INDEX IF NOT EXISTS idx_cashboxes_user ON public.cashboxes(user_id);

CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL,
  saldo_inicial numeric(18,2) NOT NULL DEFAULT 0,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
CREATE INDEX IF NOT EXISTS idx_accounts_user ON public.accounts(user_id);

CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  operacao text NOT NULL CHECK (operacao IN ('despesa','receita','aporte','retirada')),
  tipo text NOT NULL CHECK (tipo IN ('fixo','variavel')),
  especie text NOT NULL,
  ano_mes_inicial date NOT NULL,
  favorecido_id uuid REFERENCES public.clients(id),
  historico text,
  detalhes text,
  valor numeric(18,2) NOT NULL,
  proxima_vencimento date NOT NULL,
  periodo text NOT NULL CHECK (periodo IN ('mensal','anual')),
  parcelas integer NOT NULL DEFAULT 1,
  grupo_compromisso_id uuid REFERENCES public.commitment_groups(id),
  compromisso_id uuid REFERENCES public.commitments(id),
  caixa_id uuid REFERENCES public.cashboxes(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_schedules_user ON public.schedules(user_id);

CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  conta_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  operacao text NOT NULL CHECK (operacao IN ('despesa','receita','aporte','retirada','transferencia')),
  historico text,
  data_vencimento date,
  data_lancamento date NOT NULL DEFAULT (now())::date,
  valor_entrada numeric(18,2) NOT NULL DEFAULT 0,
  valor_saida numeric(18,2) NOT NULL DEFAULT 0,
  status text NOT NULL CHECK (status IN ('agendado','pendente','atrasado','pago','recebido','cancelado')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);

-- 3) RLS policies
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitment_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashboxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_policy ON public.clients
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY commitment_groups_policy ON public.commitment_groups
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY commitments_policy ON public.commitments
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY cashboxes_policy ON public.cashboxes
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY accounts_policy ON public.accounts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY schedules_policy ON public.schedules
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY transactions_policy ON public.transactions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4) RPC functions
CREATE OR REPLACE FUNCTION public.fn_generate_schedule(sched_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  s RECORD;
  i integer := 0;
  due date;
BEGIN
  SELECT * INTO s FROM public.schedules WHERE id = sched_id AND user_id = auth.uid();
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  FOR i IN 0..GREATEST(s.parcelas-1,0) LOOP
    due := CASE WHEN s.periodo = 'mensal' THEN s.proxima_vencimento + (i * INTERVAL '1 month')
                ELSE s.proxima_vencimento + (i * INTERVAL '1 year') END;
    INSERT INTO public.transactions(id,user_id,conta_id,operacao,historico,data_vencimento,data_lancamento,valor_entrada,valor_saida,status)
    VALUES (gen_random_uuid(), s.user_id, s.caixa_id, s.operacao, COALESCE(s.historico,'Agendamento'), due::date, now()::date,
            CASE WHEN s.operacao IN ('receita','aporte') THEN s.valor ELSE 0 END,
            CASE WHEN s.operacao IN ('despesa','retirada') THEN s.valor ELSE 0 END,
            'agendado');
  END LOOP;
  RETURN i+1;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_receive(tx_id uuid, conta uuid, amount numeric, d date)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.transactions SET conta_id = conta, valor_entrada = amount, status = 'recebido', data_lancamento = COALESCE(d, data_lancamento)
  WHERE id = tx_id AND user_id = auth.uid();
END;
$$;

-- 5) Seed helpers (optional)
CREATE OR REPLACE FUNCTION public.seed_minimal()
RETURNS void
LANGUAGE sql
AS $$
  INSERT INTO public.cashboxes(id,user_id,nome) VALUES (gen_random_uuid(), auth.uid(), 'Carteira') ON CONFLICT DO NOTHING;
$$;
