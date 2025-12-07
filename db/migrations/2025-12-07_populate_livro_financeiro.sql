-- Populate livro_financeiro from existing schedules

-- 1. Fixed Schedules (Recurrent)
-- Logic: Create ONE entry for the current active cycle (or next occurence).
-- For simplicity in this migration, we will create one entry with `data_vencimento` = next recurrence relative to NOW.
-- Or, if the user intends this to be a "template" for future, we might just copy it as "Active" (situation 1).
-- Given the requirement "Tabela livro_financeiro: registra os lançamentos financeiros efetivos... alimentada automaticamente ao criar um item em agendamentos",
-- we will insert one record for each Fixed schedule to representing the "current" pending item.

INSERT INTO livro_financeiro (
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
)
SELECT 
    s.id,
    s.user_id,
    s.operacao,
    s.historico,
    s.especie,
    s.caixa_id,
    s.favorecido_id,
    s.ano_mes_inicial,
    s.valor_parcela, -- Assuming valor_parcela is the amount per occurrence
    -- For Fixed, let's set next due date. 
    -- If `dia_vencimento` exists, use it combined with current month/year.
    -- If not, fallback to `ano_mes_inicial`.
    -- Let's stick to a safe default: `ano_mes_inicial` converted to date, or current date if NULL.
    COALESCE(TO_DATE(s.ano_mes_inicial || '-01', 'YYYY-MM-DD'), CURRENT_DATE), 
    1 -- 1 = Ativo
FROM schedules s
WHERE s.tipo = 'fixo';

-- 2. Variable Schedules (Installments)
-- Logic: Expand into multiple rows based on `parcelas` count.
-- If parcelas is NULL or 1, it generates 1 row.
-- If parcelas > 1, generates N rows.
INSERT INTO livro_financeiro (
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
)
SELECT 
    s.id,
    s.user_id,
    s.operacao,
    -- Add installment info to history if > 1 parcel
    CASE 
        WHEN COALESCE(s.parcelas, 1) > 1 THEN s.historico || ' (' || (gs.i + 1) || '/' || s.parcelas || ')'
        ELSE s.historico 
    END,
    s.especie,
    s.caixa_id,
    s.favorecido_id,
    s.ano_mes_inicial,
    s.valor_parcela,
    -- Calculate due date: Start Date + (i) months
    -- Handling 'mensal' (default) vs 'anual' if 'periodo' column exists. 
    -- Assuming 'mensal' for calculation as per standard installment logic.
    -- Using common trick: `(date + interval)`
    (TO_DATE(s.ano_mes_inicial || '-01', 'YYYY-MM-DD') + (gs.i || ' months')::INTERVAL)::DATE,
    1 -- 1 = Ativo
FROM schedules s
CROSS JOIN generate_series(0, COALESCE(s.parcelas, 1) - 1) AS gs(i)
WHERE s.tipo = 'variavel';
