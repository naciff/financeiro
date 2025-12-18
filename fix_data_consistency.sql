-- DATA CONSISTENCY FIX
-- Fills missing organization_id in Financials and Transactions by tracing their relationships

-- 1. Financials (Lançamentos Futuros/Parcelas)
-- Preenche baseado no Agendamento pai
UPDATE financials f
SET organization_id = s.organization_id
FROM schedules s
WHERE f.id_agendamento = s.id
AND f.organization_id IS NULL;

-- 2. Transactions (Livro Caixa - Realizados)
-- Preenche baseado no Lançamento Financeiro original (se houver)
UPDATE transactions t
SET organization_id = f.organization_id
FROM financials f
WHERE t.financial_id = f.id
AND t.organization_id IS NULL;

-- 3. Transactions (Livro Caixa - Manuais)
-- Se não tiver financial_id, tenta pegar pela Conta Bancária/Caixa utilizada
UPDATE transactions t
SET organization_id = a.organization_id
FROM accounts a
WHERE t.conta_id = a.id
AND t.organization_id IS NULL;

-- 4. Schedules (Agendamentos)
-- Caso raro, mas se houver agendamento sem org, tenta pegar pelo Usuario dono (assumindo que ele criou na org atual dele, mas aqui é mais dificil adivinhar. Vamos pular ou usar user metadata se fosse possivel).
-- Geralmente Schedules são a "fonte da verdade", então dificilmente estarão null sem serem criados errado.

-- Log de resultados
DO $$
DECLARE
    v_rows_fin int;
    v_rows_tx int;
BEGIN
    GET DIAGNOSTICS v_rows_fin = ROW_COUNT;
    RAISE NOTICE 'Financials fixed: %', v_rows_fin;
END $$;
