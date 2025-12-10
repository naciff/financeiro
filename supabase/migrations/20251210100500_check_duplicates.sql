
SELECT 
    data_lancamento, 
    historico, 
    valor_entrada,
    valor_saida,
    COUNT(*) 
FROM 
    transactions 
GROUP BY 
    data_lancamento, 
    historico, 
    valor_entrada,
    valor_saida
HAVING 
    COUNT(*) > 1;
