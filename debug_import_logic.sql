-- DEBUG IMPORT LOGIC
-- Verificar por que a transacao 35225 ficou sem cliente.

SELECT 
    t.legacy_id as transacao_legacy_id,
    t.historico,
    t.clientes_id as id_cliente_na_tabela_temp, -- Qual ID de cliente esta na tabela temporaria?
    c.id as id_cliente_reais_encontrado,       -- O banco achou esse cliente na tabela oficial?
    c.nome as nome_cliente_reais,
    t.organization_id
FROM temp_import_caixa_fourtek t
LEFT JOIN clients c ON c.legacy_id = t.clientes_id AND c.organization_id = t.organization_id
WHERE t.legacy_id = 35225;
