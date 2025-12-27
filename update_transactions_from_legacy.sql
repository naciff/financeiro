-- Script to UPDATE transactions based on legacy_id from the temp table
-- This is useful if you have re-imported data and want to sync values from the temp table
-- NOTE: This requires 'legacy_id' column in 'transactions' to be populated!

DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    
    -- Update transactions using a FROM clause to join with temp table
    UPDATE transactions tx
    SET 
        -- Update Amounts
        valor_entrada = CASE 
            WHEN lower(t.operacao) IN ('receita', 'aporte', 'r', 'c', 'ar', 'a') THEN t.valor 
            ELSE 0 
        END,
        valor_saida = CASE 
            WHEN lower(t.operacao) IN ('despesa', 'retirada', 'transferencia', 'd', 't', 'tr') THEN t.valor 
            ELSE 0 
        END,
        
        -- Update Complementary Values
        multa = COALESCE(t.multa, 0),
        juros = COALESCE(t.juros, 0),
        
        -- Optionally update updated_at timestamp
        created_at = NOW() -- or keep original? usually better to touch a timestamp

    FROM temp_import_caixa_fourtek t
    WHERE 
        -- Match by Legacy ID (mapped during import)
        tx.legacy_id = t.legacy_id
        -- Ensure Organization Match for safety
        AND tx.organization_id = t.organization_id;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Atualização concluída! % transacoes atualizadas.', updated_count;

END $$;
