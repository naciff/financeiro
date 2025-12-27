-- FIX MEMBERSCRIPT SCRIPT
-- Adiciona o usuário atual como membro da organização para liberar o acesso aos dados

DO $$
DECLARE
    curr_user_id UUID;
    org_id UUID := 'aa4b50ff-cc0f-4efe-9239-9fd83918ff68';
BEGIN
    curr_user_id := auth.uid();

    IF curr_user_id IS NULL THEN
        RAISE NOTICE 'Nenhum usuario logado no SQL Editor. Rode isso via Supabase Dashboard com seu usuario logado.';
        RETURN;
    END IF;

    -- Verificar se já é membro
    IF EXISTS (SELECT 1 FROM organization_members WHERE user_id = curr_user_id AND organization_id = org_id) THEN
        RAISE NOTICE '✅ Voce ja eh membro desta organizacao. O problema pode ser outro (verifique se eh Admin).';
        
        -- Opcional: Atualizar para Admin se não for
        UPDATE organization_members SET role = 'admin' WHERE user_id = curr_user_id AND organization_id = org_id;
        RAISE NOTICE '🔄 Permissao atualizada para ADMIN garantido.';
    ELSE
        -- Inserir como membro
        INSERT INTO organization_members (organization_id, user_id, role, created_at)
        VALUES (org_id, curr_user_id, 'admin', NOW());
        
        RAISE NOTICE '✅ SUCESSO! Voce foi adicionado como ADMIN da organizacao. O acesso deve funcionar agora.';
    END IF;

END $$;
