/*
  Update fn_reverse_ledger_item to rollback schedule date
  Run this in Supabase SQL Editor
*/

CREATE OR REPLACE FUNCTION fn_reverse_ledger_item(p_tx_id UUID, p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_tx RECORD;
    v_item RECORD;
    v_sched RECORD;
BEGIN
    SELECT * INTO v_tx FROM transactions WHERE id = p_tx_id;
    IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'Transação não encontrada'); END IF;

    IF v_tx.financial_id IS NOT NULL THEN
        -- 1. Revert financial item status to Pending (1)
        UPDATE financials SET situacao = 1, data_confirmacao = NULL, usuario_confirmou = NULL, updated_at = NOW() WHERE id = v_tx.financial_id;
        
        -- 2. Rollback Schedule Date (New Logic)
        SELECT * INTO v_item FROM financials WHERE id = v_tx.financial_id;
        IF v_item.id_agendamento IS NOT NULL THEN
             SELECT * INTO v_sched FROM schedules WHERE id = v_item.id_agendamento;
             
             IF v_sched.tipo = 'fixo' THEN
                 IF v_sched.periodo = 'anual' THEN
                     UPDATE schedules SET proxima_vencimento = proxima_vencimento - INTERVAL '1 year' WHERE id = v_item.id_agendamento;
                 ELSIF v_sched.periodo = 'semestral' THEN
                     UPDATE schedules SET proxima_vencimento = proxima_vencimento - INTERVAL '6 months' WHERE id = v_item.id_agendamento;
                 ELSE
                     -- Default monthly
                     UPDATE schedules SET proxima_vencimento = proxima_vencimento - INTERVAL '1 month' WHERE id = v_item.id_agendamento;
                 END IF;
             END IF;
             -- Variable schedules (installments) usually don't rollback 'next due' in the same way or logic involves checking parcelas.
             -- But request implies specific "date returning to current month".
             -- If it was updated +1 month on confirm, we -1 month here.
        END IF;
    END IF;

    -- 3. Delete the transaction (Trigger will log to transaction_logs)
    DELETE FROM transactions WHERE id = p_tx_id;
    
    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
