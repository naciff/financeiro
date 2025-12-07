-- FIX: Re-create missing RPC functions
-- Run this script to restore the functionality

-- 1. DROP old functions to ensure clean slate (ignore errors if they don't exist)
DROP FUNCTION IF EXISTS fn_confirm_ledger_item(UUID, UUID, NUMERIC, DATE, UUID);
DROP FUNCTION IF EXISTS fn_reverse_ledger_item(UUID, UUID);

-- 2. Create Confirm Function
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
    v_next_date DATE;
BEGIN
    SELECT * INTO v_item FROM financials WHERE id = p_item_id;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Item não encontrado'); END IF;

    SELECT * INTO v_sched FROM schedules WHERE id = v_item.id_agendamento;

    UPDATE financials SET situacao = 2, data_confirmacao = p_data_pagamento, usuario_confirmou = p_user_id, updated_at = NOW() WHERE id = p_item_id;

    INSERT INTO transactions (user_id, operacao, especie, historico, conta_id, compromisso_id, cliente_id, financial_id, data_vencimento, data_lancamento, valor_entrada, valor_saida, status, detalhes, cliente, compromisso)
    VALUES (p_user_id, v_item.operacao, v_item.especie, v_item.historico, p_conta_id, (SELECT compromisso_id FROM schedules WHERE id = v_item.id_agendamento), v_item.favorecido_id, v_item.id, v_item.data_vencimento, p_data_pagamento, CASE WHEN v_item.operacao IN ('receita', 'aporte') THEN p_valor_pago ELSE 0 END, CASE WHEN v_item.operacao IN ('despesa', 'retirada') THEN p_valor_pago ELSE 0 END, 'pago', json_build_object('origem', 'Gerado via Controle e Previsão'), (SELECT nome FROM clients WHERE id = v_item.favorecido_id), (SELECT nome FROM commitments WHERE id = (SELECT compromisso_id FROM schedules WHERE id = v_item.id_agendamento)));

    IF v_sched.tipo = 'fixo' THEN
        SELECT MAX(data_vencimento) INTO v_next_date FROM financials WHERE id_agendamento = v_item.id_agendamento;
        IF v_sched.periodo = 'anual' THEN v_next_date := v_next_date + INTERVAL '1 year';
        ELSIF v_sched.periodo = 'semestral' THEN v_next_date := v_next_date + INTERVAL '6 months';
        ELSE v_next_date := v_next_date + INTERVAL '1 month'; END IF;

        INSERT INTO financials (id_agendamento, user_id, operacao, historico, especie, caixa_id, favorecido_id, ano_mes_inicial, valor, data_vencimento, situacao)
        VALUES (v_item.id_agendamento, v_item.user_id, v_item.operacao, v_item.historico, v_item.especie, v_item.caixa_id, v_item.favorecido_id, v_item.ano_mes_inicial, v_sched.valor, v_next_date, 1);
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 3. Create Reverse Function
CREATE OR REPLACE FUNCTION fn_reverse_ledger_item(p_tx_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_tx RECORD;
BEGIN
    SELECT * INTO v_tx FROM transactions WHERE id = p_tx_id;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Transação não encontrada'); END IF;

    IF v_tx.financial_id IS NOT NULL THEN
        UPDATE financials SET situacao = 1, data_confirmacao = NULL, usuario_confirmou = NULL, updated_at = NOW() WHERE id = v_tx.financial_id;
    END IF;

    DELETE FROM transactions WHERE id = p_tx_id;
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- 4. Grant Permissions (Ensure Authenticated users can execute)
GRANT EXECUTE ON FUNCTION fn_confirm_ledger_item(UUID, UUID, NUMERIC, DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_confirm_ledger_item(UUID, UUID, NUMERIC, DATE, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION fn_reverse_ledger_item(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_reverse_ledger_item(UUID, UUID) TO service_role;

-- 5. Force PostgREST Schema Cache Reload
NOTIFY pgrst, 'reload schema';
