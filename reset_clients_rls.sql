-- FIX RLS DEFINITIVO
-- Remove todas as regras antigas e cria uma regra simples baseada APENAS na organização.

DO $$
BEGIN
    -- 1. Desabilitar RLS momentaneamente para garantir acesso imediato se precisar debugar
    ALTER TABLE IF EXISTS public.clients DISABLE ROW LEVEL SECURITY;

    -- 2. Limpar todas as policies complexas antigas
    DROP POLICY IF EXISTS "Users can view organization clients" ON public.clients;
    DROP POLICY IF EXISTS "Users can create clients in their organizations" ON public.clients;
    DROP POLICY IF EXISTS "Users can edit organization clients" ON public.clients;
    DROP POLICY IF EXISTS "Users can delete organization clients" ON public.clients;
    DROP POLICY IF EXISTS "p_clients_owner" ON public.clients;

    -- 3. Habilitar RLS novamente
    ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;

    -- 4. CRIAR REGRA DE OURO (Golden Rule)
    -- Se o organization_id do cliente bater com o organization_id de um membro, LIBERA.
    -- Sem checar owner, sem checar user_id. Apenas: "Você é da empresa? Então pode ver."
    
    CREATE POLICY "members_access_policy"
    ON public.clients
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM public.organization_members om
            WHERE om.organization_id = clients.organization_id 
            AND om.user_id = auth.uid()
        )
    );

    RAISE NOTICE 'RLS recriado com regra simplificada de membro.';

END $$;
