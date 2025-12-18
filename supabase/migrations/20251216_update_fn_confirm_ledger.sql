-- Function to confirm a provision in financials (formerly livro_financeiro)
-- 1. Updates situacao to 2 (Confirmed)
-- 2. Inserts into transactions (Cash Book)
-- 3. If Fixed, generates next occurrence

CREATE OR REPLACE FUNCTION fn_confirm_ledger_item(
    p_item_id UUID,
    p_user_id UUID,
    p_valor_pago NUMERIC, -- Allow overriding the amount
    p_data_pagamento DATE,
    p_conta_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_item RECORD;
    v_sched RECORD;
    v_next_date DATE;
    v_new_id UUID;
BEGIN
    -- 1. Get List Item
    SELECT * INTO v_item FROM financials WHERE id = p_item_id;
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Item não encontrado');
    END IF;

    -- 2. Get Schedule Info
    SELECT * INTO v_sched FROM schedules WHERE id = v_item.id_agendamento;

    -- 3. Update Financials (Confirm)
    UPDATE financials 
    SET 
        situacao = 2, -- Confirmado
        data_confirmacao = p_data_pagamento,
        usuario_confirmou = p_user_id,
        updated_at = NOW()
    WHERE id = p_item_id;

    -- 4. Insert into Transactions (Cash Book)
    INSERT INTO transactions (
        user_id,
        operacao,
        especie,
        historico,
        conta_id, -- Matches Ledger usage
        compromisso_id, -- Relational ID
        cliente_id,     -- Relational ID
        financial_id, -- Traceability for Reversal
        data_vencimento,
        data_lancamento,
        valor_entrada,
        valor_saida,
        status,
        nota_fiscal,
        detalhes
    )
    VALUES (
        p_user_id,
        v_item.operacao,
        v_item.especie,
        COALESCE(v_item.historico, 'Lançamento Confirmado'),
        p_conta_id,
        v_item.compromisso_id,
        v_item.cliente_id,
        p_item_id, -- LINKING ID
        v_item.vencimento,
        p_data_pagamento,
        CASE WHEN v_item.operacao IN ('receita','aporte') THEN p_valor_pago ELSE 0 END,
        CASE WHEN v_item.operacao IN ('despesa','retirada') THEN p_valor_pago ELSE 0 END,
        'pago', -- Confirmed items are paid
        v_item.nota_fiscal,
        v_item.detalhes
    )
    RETURNING id INTO v_new_id;

    RETURN json_build_object('success', true, 'message', 'Lançamento confirmado com sucesso', 'transaction_id', v_new_id);
END;
$$ LANGUAGE plpgsql;
