-- Final conversion script: Temp -> Transactions
-- This script moves data from 'temp_import_caixa' to 'transactions'
-- resolving legacy IDs to new UUIDs.

DO $$ 
DECLARE 
    target_user_id UUID;
    imported_count INTEGER;
BEGIN
    -- 1. Get the Main User ID (assuming single user or first user)
    SELECT id INTO target_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

    -- 2. Insert into Transactions
    INSERT INTO transactions (
        user_id,
        conta_id,
        cliente_id,
        compromisso_id,
        grupo_compromisso_id,
        operacao,
        especie,
        historico,
        data_lancamento,
        data_vencimento,
        valor_entrada,
        valor_saida,
        status,
        created_at
    )
    SELECT
        target_user_id,
        acc.id AS conta_id,        -- UUID from Accounts mapped by legacy caixa_id
        cli.id AS cliente_id,      -- UUID from Clients mapped by legacy clientes_id
        com.id AS compromisso_id,  -- UUID from Commitments mapped by legacy compromisso_id
        grp.id AS grupo_compromisso_id, -- UUID from Commitment Groups mapped by legacy grupo_compromisso_id
        
        -- Operation Mapping (Restored Mapping logic to handle 'a', 'd', 'r' etc)
        CASE 
            WHEN lower(t.operacao) IN ('despesa', 'd', 'pagamento') THEN 'despesa'
            WHEN lower(t.operacao) IN ('receita', 'c', 'r') THEN 'receita'
            WHEN lower(t.operacao) IN ('aporte', 'ar', 'a') THEN 'aporte'
            WHEN lower(t.operacao) IN ('retirada') THEN 'retirada'
            WHEN lower(t.operacao) IN ('transferencia', 't', 'tr') THEN 'transferencia'
            ELSE 'despesa' -- Default/Fallback if unknown
        END,

        -- Payment Method Mapping (Using provided list)
        CASE 
            WHEN lower(t.especie) LIKE '%cartão%' OR lower(t.especie) LIKE '%cartao%' THEN 'cartao_credito'
            WHEN lower(t.especie) LIKE '%debito automático%' OR lower(t.especie) LIKE '%debito automatico%' THEN 'debito_automatico'
            WHEN lower(t.especie) LIKE '%transferência%' OR lower(t.especie) LIKE '%transferencia%' THEN 'transferencia'
            WHEN lower(t.especie) LIKE '%boleto%' THEN 'boleto'
            WHEN lower(t.especie) LIKE '%dinheiro%' THEN 'dinheiro'
            WHEN lower(t.especie) LIKE '%pix%' THEN 'pix'
            ELSE 'dinheiro' -- Default Fallback
        END,

        -- History + Details
        CASE 
            WHEN t.detalhes IS NOT NULL AND t.detalhes <> '' THEN t.historico || ' - ' || t.detalhes
            ELSE t.historico 
        END,

        -- Dates (Source is already DATE, so simply cast/assign)
        t.data_lancamento::date, 
        t.data_vencimento::date,

        -- Values (Input/Output based on Operation)
        CASE 
            WHEN lower(t.operacao) IN ('receita', 'aporte', 'r', 'c', 'ar', 'a') THEN t.valor 
            ELSE 0 
        END,
        CASE 
            WHEN lower(t.operacao) IN ('despesa', 'retirada', 'transferencia', 'd', 't', 'tr') THEN t.valor 
            ELSE 0 
        END,

        'pago', -- Status default as TEXT
        NOW()

    FROM temp_import_caixa t
    -- Left Joins to resolve Legacy IDs
    LEFT JOIN accounts acc ON acc.legacy_id = t.caixa_id
    LEFT JOIN clients cli ON cli.legacy_id = t.clientes_id
    LEFT JOIN commitments com ON com.legacy_id = t.compromisso_id
    LEFT JOIN commitment_groups grp ON grp.legacy_id = t.grupo_compromisso_id
    ;

    GET DIAGNOSTICS imported_count = ROW_COUNT;
    RAISE NOTICE 'Importacao concluida! % transacoes inseridas.', imported_count;
END $$;
