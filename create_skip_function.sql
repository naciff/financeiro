-- Create fn_skip_ledger_item to handle "Skipping" a launch properly
-- It marks the current item as Skipped (4) and generates the next installment if recurrent.

CREATE OR REPLACE FUNCTION fn_skip_ledger_item(
    p_item_id UUID,
    p_user_id UUID
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

    -- 1. Mark current item as Skipped (4)
    UPDATE financials SET situacao = 4, updated_at = NOW() WHERE id = p_item_id;

    -- 2. Generate Next Installment if Fixed
    IF v_sched.tipo = 'fixo' THEN
        SELECT MAX(data_vencimento) INTO v_next_date FROM financials WHERE id_agendamento = v_item.id_agendamento;
        
        -- Logic to advance date based on period
        IF v_sched.periodo = 'anual' THEN v_next_date := v_next_date + INTERVAL '1 year';
        ELSIF v_sched.periodo = 'semestral' THEN v_next_date := v_next_date + INTERVAL '6 months';
        ELSE v_next_date := v_next_date + INTERVAL '1 month'; END IF;

        -- Insert next pending item (status 1)
        INSERT INTO financials (
            id_agendamento, user_id, organization_id, operacao, historico, especie, caixa_id, favorecido_id, 
            ano_mes_inicial, valor, data_vencimento, situacao
        )
        VALUES (
            v_item.id_agendamento, v_item.user_id, v_item.organization_id, v_item.operacao, v_item.historico, v_item.especie, v_item.caixa_id, v_item.favorecido_id, 
            v_item.ano_mes_inicial, v_sched.valor, v_next_date, 1
        );
    END IF;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION fn_skip_ledger_item(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_skip_ledger_item(UUID, UUID) TO service_role;
