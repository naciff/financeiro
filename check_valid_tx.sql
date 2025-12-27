-- CHECK VALID TRANSACTION AND IMPORT STRUCTURE
-- 1. Encontrar uma transação que DEFINITIVAMENTE tem cliente vinculado
SELECT 
    t.id, 
    t.historico, 
    c.nome as NOME_QUE_DEVE_APARECER,
    t.data_vencimento
FROM transactions t
JOIN clients c ON c.id = t.cliente_id
WHERE t.organization_id = 'aa4b50ff-cc0f-4efe-9239-9fd83918ff68'
ORDER BY t.created_at DESC
LIMIT 1;

-- 2. Checar colunas da tabela temporária (para ver se tem outro campo de nome)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'temp_import_caixa_fourtek';
