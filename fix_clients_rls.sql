-- Fix RLS policies for clients table to allow organization-based access
-- This ensures users can see clients created by other members (or migration scripts) of the same organization

DO $$
BEGIN
    -- Drop existing strict owner policy if it exists
    DROP POLICY IF EXISTS "p_clients_owner" ON public.clients;
    
    -- Drop previous attempts at fixing policies to ensure clean slate
    DROP POLICY IF EXISTS "Users can view organization clients" ON public.clients;
    DROP POLICY IF EXISTS "Users can create clients in their organizations" ON public.clients;
    DROP POLICY IF EXISTS "Users can edit organization clients" ON public.clients;
    DROP POLICY IF EXISTS "Users can delete organization clients" ON public.clients;

    -- Create new comprehensive policies

    -- For SELECT (Viewing)
    CREATE POLICY "Users can view organization clients"
    ON public.clients FOR SELECT
    USING (
        auth.uid() = user_id -- Created by user
        OR
        EXISTS ( -- Is Member
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = clients.organization_id
            AND om.user_id = auth.uid()
        )
        OR
        EXISTS ( -- Is Owner
            SELECT 1 FROM public.organizations o
            WHERE o.id = clients.organization_id
            AND o.owner_id = auth.uid()
        )
    );

    -- For INSERT (Creating)
    CREATE POLICY "Users can create clients in their organizations"
    ON public.clients FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        AND (
            EXISTS ( -- Is Member
                SELECT 1 FROM public.organization_members om
                WHERE om.organization_id = organization_id
                AND om.user_id = auth.uid()
            )
            OR
            EXISTS ( -- Is Owner
                SELECT 1 FROM public.organizations o
                WHERE o.id = organization_id
                AND o.owner_id = auth.uid()
            )
        )
    );

    -- For UPDATE (Editing)
    CREATE POLICY "Users can edit organization clients"
    ON public.clients FOR UPDATE
    USING (
        auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = clients.organization_id
            AND om.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = clients.organization_id
            AND o.owner_id = auth.uid()
        )
    );

    -- For DELETE (Deleting)
    CREATE POLICY "Users can delete organization clients"
    ON public.clients FOR DELETE
    USING (
        auth.uid() = user_id
        OR
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = clients.organization_id
            AND om.user_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.organizations o
            WHERE o.id = clients.organization_id
            AND o.owner_id = auth.uid()
        )
    );

EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
