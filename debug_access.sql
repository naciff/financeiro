-- DEBUG ACCESS SCRIPT
-- Vamos checar por que o seu usuário talvez não esteja "vendo" o cliente, mesmo ele existindo.

SELECT 
    c.id, 
    c.nome, 
    c.organization_id, 
    c.user_id as criado_por_user_id,
    o.owner_id as dono_da_organizacao,
    CASE 
        WHEN o.owner_id = auth.uid() THEN 'VC É O DONO'
        ELSE 'VC NÃO É O DONO'
    END as check_dono
FROM clients c
JOIN organizations o ON o.id = c.organization_id
WHERE c.id = '98439d9b-5362-4745-91e7-dd564751e2a2'; 
-- Esse ID eu peguei do seu print (Cliente "IMAGEM 7")
