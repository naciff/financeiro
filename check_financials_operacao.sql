-- Check the stored operation type for the 'Combustível' item
SELECT 
    f.id as financial_id,
    f.historico, 
    f.operacao as financials_operacao, 
    f.valor,
    s.id as schedule_id,
    s.operacao as schedule_operacao
FROM financials f
LEFT JOIN schedules s ON f.id_agendamento = s.id
WHERE f.historico ILIKE '%Combustível%';
