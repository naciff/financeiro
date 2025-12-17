-- 1. Clean up PENDING items (situacao = 1)
-- This removes duplicates or old pending projections
DELETE FROM financials 
WHERE situacao = 1;

-- 2. Regenerate Pending Items based on Active Schedules
-- NOTE: Removed cost_center_id as it does not exist in financials table
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Only process active schedules (not concluded)
    FOR r IN SELECT * FROM schedules WHERE situacao != 2 LOOP
        -- Only insert if proxima_vencimento is set
        IF r.proxima_vencimento IS NOT NULL THEN
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
                situacao,
                created_at,
                updated_at
            ) VALUES (
                r.id,
                r.user_id,
                r.operacao,
                r.historico,
                r.especie,
                r.caixa_id,
                r.favorecido_id,
                r.ano_mes_inicial,
                r.valor,
                r.proxima_vencimento,
                1, -- Pendente
                NOW(),
                NOW()
            );
        END IF;
    END LOOP;
END $$;
