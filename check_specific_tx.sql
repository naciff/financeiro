-- CHECK SPECIFIC TRANSACTION
-- Verificando se o cliente_id existe no banco para a transacao do log.

SELECT 
    id, 
    historico, 
    cliente_id, 
    legacy_id,
    created_at
FROM transactions
WHERE id = '2180105f-f616-4ea7-a24c-af8f2796bc85';
