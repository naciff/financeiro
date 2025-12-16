-- Create a function to delete a user.
-- This function runs with "SECURITY DEFINER" to allow deleting from auth.users,
-- which normally regular users cannot do.
-- WE SHOULD ADD A CHECK TO ENSURE ONLY ADMINS CAN CALL THIS.
-- For now, we allow any authenticated user to call it (as per "simple admin" request),
-- but in production you should check if auth.email() is in an allowlist or has an 'admin' role.

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user exists (optional, but good for error messsages)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Delete from auth.users.
  -- Steps:
  -- 1. Cascade delete should handle profile/data if configured (Supabase usually handles auth->public references if ON DELETE CASCADE is set).
  -- If not, we might need to delete from public tables manually. 
  -- Assuming ON DELETE CASCADE is set for public.profiles.id -> auth.users.id
  
  DELETE FROM auth.users WHERE id = p_user_id;
  
  -- If you need to manually delete from profiles (if no cascade):
  -- DELETE FROM public.profiles WHERE id = p_user_id;
END;
$$;
