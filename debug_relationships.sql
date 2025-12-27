-- DB DEBUG SCRIPT: Check Transaction <-> Client Relationship (Visual Version)
-- Returns a table of results so you can see it in the Grid.

SELECT 
    t.historico,
    t.legacy_id,
    t.cliente_id,
    CASE 
        WHEN c.id IS NOT NULL THEN '✅ ENCONTRADO' 
        ELSE '❌ NAO EXISTE' 
    END as status_vinculo,
    c.nome as nome_cliente_no_banco
FROM transactions t
LEFT JOIN clients c ON c.id = t.cliente_id
WHERE t.organization_id = 'aa4b50ff-cc0f-4efe-9239-9fd83918ff68'
ORDER BY t.created_at DESC
LIMIT 20;

-- Se o resultado for vazio (nenhuma linha), significa que a importação não inseriu nada ou você apagou tudo e não importou.
