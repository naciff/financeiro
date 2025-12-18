-- Add permissions column to organization_members if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'organization_members' 
        AND column_name = 'permissions'
    ) THEN
        ALTER TABLE public.organization_members 
        ADD COLUMN permissions jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add UPDATE policy for organization owners
DO $$
BEGIN
    DROP POLICY IF EXISTS "Owners can update members" ON public.organization_members;
    CREATE POLICY "Owners can update members"
      ON public.organization_members FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.organizations o
          WHERE o.id = organization_members.organization_id
          AND o.owner_id = auth.uid()
        )
      );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
