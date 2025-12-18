-- DROP existing table to ensure schema compatibility
DROP TABLE IF EXISTS public.organization_members CASCADE;

-- Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at timestamptz DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view the list of members for their organizations
DO $$
BEGIN
    DROP POLICY IF EXISTS "Members can view other members in the same organization" ON public.organization_members;
    CREATE POLICY "Members can view other members in the same organization"
      ON public.organization_members FOR SELECT
      USING (
        auth.uid() = user_id -- Can see self
        OR
        EXISTS ( -- Can see if they are a member of the same org
          SELECT 1 FROM public.organization_members om
          WHERE om.organization_id = organization_members.organization_id
          AND om.user_id = auth.uid()
        )
        OR
        EXISTS ( -- Can see if they are the owner of the org
          SELECT 1 FROM public.organizations o
          WHERE o.id = organization_members.organization_id
          AND o.owner_id = auth.uid()
        )
      );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Policy: Owners can add members
DO $$
BEGIN
    DROP POLICY IF EXISTS "Owners can add members" ON public.organization_members;
    CREATE POLICY "Owners can add members"
      ON public.organization_members FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.organizations o
          WHERE o.id = organization_members.organization_id
          AND o.owner_id = auth.uid()
        )
      );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Policy: Owners can remove members
DO $$
BEGIN
    DROP POLICY IF EXISTS "Owners can remove members" ON public.organization_members;
    CREATE POLICY "Owners can remove members"
      ON public.organization_members FOR DELETE
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

-- Backfill owners into organization_members
INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM public.organizations
ON CONFLICT (organization_id, user_id) DO NOTHING;
