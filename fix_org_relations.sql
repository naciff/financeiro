-- FIX ORGANIZATION RELATIONS
-- This is required for Supabase to correctly join the 'profiles' table when querying 'organization_members'

-- 1. We need to point the FKs to public.profiles instead of auth.users
--    Supabase PostgREST needs this to know how to resolve the join "owner:owner_id"

-- Drop existing constraints if they exist (names might vary, so we check or try blindly)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'organization_members_owner_id_fkey') THEN
    ALTER TABLE public.organization_members DROP CONSTRAINT organization_members_owner_id_fkey;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'organization_members_member_id_fkey') THEN
    ALTER TABLE public.organization_members DROP CONSTRAINT organization_members_member_id_fkey;
  END IF;
END $$;

-- Add new constraints pointing to public.profiles
-- Note: User IDs in auth.users and public.profiles are identical.
-- 'ON DELETE CASCADE' means if profile is deleted, remove membership.
ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_owner_id_fkey
  FOREIGN KEY (owner_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_member_id_fkey
  FOREIGN KEY (member_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Refresh cache
NOTIFY pgrst, 'reload config';
