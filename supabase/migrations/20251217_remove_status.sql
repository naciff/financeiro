-- Migration to remove 'status' column from transactions table
-- and update dependent functions to treat all transactions as Realized.

-- 0. Drop dependent view
DROP VIEW IF EXISTS account_balances_view;

-- 1. Update fn_confirm_ledger_item (Remove status)
CREATE OR REPLACE FUNCTION fn_confirm_ledger_item(
    p_item_id UUID,
    p_user_id UUID,
    p_valor_pago NUMERIC,
    p_data_pagamento DATE,
    p_conta_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_item RECORD;
    v_sched RECORD;
    v_new_id UUID;
BEGIN
    SELECT * INTO v_item FROM financials WHERE id = p_item_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Item não encontrado');
    END IF;

    SELECT * INTO v_sched FROM schedules WHERE id = v_item.id_agendamento;

    UPDATE financials 
    SET situacao = 2, data_confirmacao = p_data_pagamento, usuario_confirmou = p_user_id, updated_at = NOW()
    WHERE id = p_item_id;

    INSERT INTO transactions (
        user_id, operacao, especie, historico, conta_id, compromisso_id, cliente_id, 
        financial_id, 
        data_vencimento, data_lancamento, valor_entrada, valor_saida, 
        -- status removed
        nota_fiscal, detalhes, concluido_em
    )
    VALUES (
        p_user_id, v_item.operacao, v_item.especie, COALESCE(v_item.historico, 'Lançamento Confirmado'),
        p_conta_id, v_item.compromisso_id, v_item.cliente_id,
        p_item_id,
        v_item.vencimento, p_data_pagamento,
        CASE WHEN v_item.operacao IN ('receita','aporte') THEN p_valor_pago ELSE 0 END,
        CASE WHEN v_item.operacao IN ('despesa','retirada') THEN p_valor_pago ELSE 0 END,
        -- 'pago' removed
        v_item.nota_fiscal, v_item.detalhes, now()
    )
    RETURNING id INTO v_new_id;

    RETURN json_build_object('success', true, 'message', 'Lançamento confirmado com sucesso', 'transaction_id', v_new_id);
END;
$$ LANGUAGE plpgsql;

-- 2. Update fn_generate_schedule (Remove status)
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
    INSERT INTO public.transactions(id,user_id,conta_id,operacao,historico,data_vencimento,data_lancamento,valor_entrada,valor_saida)
    VALUES (gen_random_uuid(), s.user_id, s.caixa_id, s.operacao, COALESCE(s.historico,'Agendamento'), due::date, now()::date,
            CASE WHEN s.operacao IN ('receita','aporte') THEN s.valor ELSE 0 END,
            CASE WHEN s.operacao IN ('despesa','retirada') THEN s.valor ELSE 0 END
            -- status removed
           );
  END LOOP;
  RETURN i+1;
END;
$$;

-- 3. Update fn_receive (Remove status update)
CREATE OR REPLACE FUNCTION public.fn_receive(tx_id uuid, conta uuid, amount numeric, d date)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.transactions 
  SET conta_id = conta, valor_entrada = amount, data_lancamento = COALESCE(d, data_lancamento)
  -- status update removed
  WHERE id = tx_id AND user_id = auth.uid();
END;
$$;

-- 4. Drop the column
ALTER TABLE public.transactions DROP COLUMN IF EXISTS status CASCADE;

-- 5. Recreate the view without status filter
CREATE VIEW account_balances_view AS
SELECT
  a.id AS account_id,
  a.user_id,
  COALESCE(a.saldo_inicial, 0) + COALESCE(
    (
      SELECT SUM(t.valor_entrada - t.valor_saida)
      FROM transactions t
      WHERE t.conta_id = a.id
      -- Status check removed: all transactions count towards balance
    ),
    0
  ) AS saldo_atual
FROM accounts a;
