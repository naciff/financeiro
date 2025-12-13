-- DIAGNOSE ACCESS FOR USER
-- Run this in the Supabase SQL Editor

-- 1. Check current User ID (this will be the ID of the person running the query, likely the owner or dev)
-- To check specific user, you'd need their ID. But usually RLS policies depend on auth.uid()

SELECT auth.uid() as my_user_id;

-- 2. Check if there are organization memberships for me
SELECT * FROM public.organization_members WHERE member_id = auth.uid();

-- 3. Check if I can see owner profiles (if I am a member)
-- If this returns rows, then Profile RLS is working. If empty, it's broken.
SELECT 
  o.owner_id, 
  p.name, 
  p.email 
FROM public.organization_members o
LEFT JOIN public.profiles p ON p.id = o.owner_id
WHERE o.member_id = auth.uid();

-- 4. Check if RLS is enabled on organization_members
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'organization_members';

-- 5. List all policies on organization_members
select * from pg_policies where tablename = 'organization_members';
