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
        detalhes,
        cliente, -- Text desc
        compromisso -- Text desc
    ) VALUES (
        p_user_id,
        v_item.operacao,
        v_item.especie,
        v_item.historico,
        p_conta_id,
        (SELECT compromisso_id FROM schedules WHERE id = v_item.id_agendamento), -- Link ID
        v_item.favorecido_id, -- Link ID
        v_item.id, -- Traceability for Reversal
        v_item.data_vencimento,
        p_data_pagamento,
        CASE WHEN v_item.operacao IN ('receita', 'aporte') THEN p_valor_pago ELSE 0 END,
        CASE WHEN v_item.operacao IN ('despesa', 'retirada') THEN p_valor_pago ELSE 0 END,
        'pago',
        json_build_object('origem', 'Gerado via Controle e Previsão'), -- Fix JSON type
        (SELECT nome FROM clients WHERE id = v_item.favorecido_id), -- Lookup Name
        (SELECT nome FROM commitments WHERE id = (SELECT compromisso_id FROM schedules WHERE id = v_item.id_agendamento)) -- Lookup Name
    );

    -- 5. Handle Fixed Schedule Recurrence (Rolling Forecast)
    IF v_sched.tipo = 'fixo' THEN
        -- "Endless Scroll": Always ensure we add one more item at the end of the chain
        -- Find the furthest existing date
        SELECT MAX(data_vencimento) INTO v_next_date FROM financials WHERE id_agendamento = v_item.id_agendamento;
        
        -- Determine Interval
        IF v_sched.periodo = 'anual' THEN
            v_next_date := v_next_date + INTERVAL '1 year';
        ELSIF v_sched.periodo = 'semestral' THEN
            v_next_date := v_next_date + INTERVAL '6 months';
        ELSE
            v_next_date := v_next_date + INTERVAL '1 month';
        END IF;

        -- Insert Next Occurrence (maintains the 12-month window moving forward)
        INSERT INTO financials (
            id_agendamento,
            user_id,
            operacao,
            historico,
            especie,
            caixa_id,
            favorecido_id,
            ano_mes_inicial,
            valor,
            data_vencimento,
            situacao
        ) VALUES (
            v_item.id_agendamento,
            v_item.user_id,
            v_item.operacao,
            v_item.historico,
            v_item.especie,
            v_item.caixa_id,
            v_item.favorecido_id,
            v_item.ano_mes_inicial,
            v_sched.valor, 
            v_next_date,
            1 -- Active
        );
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
