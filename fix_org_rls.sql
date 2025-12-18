-- Fix RLS policies for organizations table
-- Enable RLS (just in case)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 1. Allow authenticated users to create organizations
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
    CREATE POLICY "Users can create organizations"
    ON public.organizations FOR INSERT
    WITH CHECK (auth.uid() = owner_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Allow users to view organizations they own or are members of
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
    CREATE POLICY "Users can view their organizations"
    ON public.organizations FOR SELECT
    USING (
        auth.uid() = owner_id
        OR
        EXISTS (
            SELECT 1 FROM public.organization_members om
            WHERE om.organization_id = organizations.id
            AND om.user_id = auth.uid()
        )
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Allow owners to update their organizations
DO $$
BEGIN
    DROP POLICY IF EXISTS "Owners can update their organizations" ON public.organizations;
    CREATE POLICY "Owners can update their organizations"
    ON public.organizations FOR UPDATE
    USING (auth.uid() = owner_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Allow owners to delete their organizations
DO $$
BEGIN
    DROP POLICY IF EXISTS "Owners can delete their organizations" ON public.organizations;
    CREATE POLICY "Owners can delete their organizations"
    ON public.organizations FOR DELETE
    USING (auth.uid() = owner_id);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
