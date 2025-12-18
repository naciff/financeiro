-- FUNCTION: update_member_permissions
-- Description: Allows organization owners to update permissions of their members securely.
-- This function uses SECURITY DEFINER to bypass RLS recursion issues when checking ownership.

CREATE OR REPLACE FUNCTION public.update_member_permissions(
    p_member_id uuid,
    p_permissions jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_org_id uuid;
    v_is_owner boolean;
BEGIN
    -- 1. Identify the organization for the target member
    SELECT organization_id INTO v_org_id
    FROM public.organization_members
    WHERE id = p_member_id;

    IF v_org_id IS NULL THEN
        RAISE EXCEPTION 'Membro não encontrado.';
    END IF;

    -- 2. Verify if the executing user (auth.uid()) is the OWNER of that organization
    --    We check the 'organizations' table directly.
    SELECT EXISTS (
        SELECT 1 
        FROM public.organizations 
        WHERE id = v_org_id 
        AND owner_id = auth.uid()
    ) INTO v_is_owner;

    -- 3. If not owner, check if is Master Admin (optional, for safety)
    IF NOT v_is_owner THEN
        -- Allow if email is the master email (hardcoded safety net or check profile)
        -- For now, strict owner check is safer.
        RAISE EXCEPTION 'Acesso negado: Apenas o proprietário da organização pode alterar permissões.';
    END IF;

    -- 4. Perform the update
    UPDATE public.organization_members
    SET permissions = p_permissions
    WHERE id = p_member_id;

END;
$$;
