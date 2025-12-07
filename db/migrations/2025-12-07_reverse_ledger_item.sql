-- Function to REVERSE (Estornar) a transaction generated from Livro Financeiro
-- 1. Deletes the transaction
-- 2. Resets the Livro Financeiro item to status 1 (Pending)

CREATE OR REPLACE FUNCTION fn_reverse_ledger_item(
    p_tx_id UUID,
    p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_tx RECORD;
    v_rows_affected INTEGER;
BEGIN
    -- 1. Get Transaction
    SELECT * INTO v_tx FROM transactions WHERE id = p_tx_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Transação não encontrada');
    END IF;

    -- 2. Verify link to Financials
    IF v_tx.financial_id IS NOT NULL THEN
        -- 3. Reset Financials Item
        UPDATE financials 
        SET 
            situacao = 1, -- Voltar para Agendado
            data_confirmacao = NULL,
            usuario_confirmou = NULL,
            updated_at = NOW()
        WHERE id = v_tx.financial_id;
        
        -- Check if update happened
        GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
        IF v_rows_affected = 0 THEN
             -- Warning: Transaction had an ID but item not found (maybe deleted?). Proceed with tx delete?
             -- Better to proceed to ensure cleanup.
        END IF;
    END IF;

    -- 4. Delete Transaction
    DELETE FROM transactions WHERE id = p_tx_id;

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
