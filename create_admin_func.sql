-- Function to list all organizations for the master user, including owner details
CREATE OR REPLACE FUNCTION public.get_all_organizations_admin()
RETURNS TABLE (
  id uuid,
  name text,
  owner_id uuid,
  created_at timestamptz,
  owner_name text,
  owner_email text,
  owner_avatar text
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_email text;
BEGIN
    -- Get email from JWT (More reliable than querying auth.users in some contexts)
    current_email := auth.jwt() ->> 'email';
    
    -- Check if it is the master user (Robust check)
    IF TRIM(LOWER(current_email)) = 'ramon.naciff@gmail.com' THEN
        RETURN QUERY
        SELECT 
            o.id, 
            o.name, 
            o.owner_id, 
            o.created_at,
            p.name as owner_name,
            p.email as owner_email,
            p.avatar_url as owner_avatar
        FROM public.organizations o
        LEFT JOIN public.profiles p ON o.owner_id = p.id
        ORDER BY p.name NULLS LAST, o.name;
    ELSE
        -- Return empty if not authorized
        -- (Optional: We could Raise Exception to make it clear in logs why it failed)
        RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::uuid, NULL::timestamptz, NULL::text, NULL::text, NULL::text WHERE 1=0;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to add a member to ANY organization (Admin only)
CREATE OR REPLACE FUNCTION public.add_org_member_admin(target_org_id uuid, target_email text, target_role text DEFAULT 'member')
RETURNS text
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_email text;
    target_user_id uuid;
BEGIN
    -- 1. Check Admin Permissions
    SELECT email INTO current_email FROM auth.users WHERE id = auth.uid();
    
    IF TRIM(LOWER(current_email)) <> 'ramon.naciff@gmail.com' THEN
        RAISE EXCEPTION 'Access Denied: Only Master User can perform this action.';
    END IF;

    -- 2. Find the user to add
    SELECT id INTO target_user_id FROM public.profiles WHERE email = target_email LIMIT 1;
    
    IF target_user_id IS NULL THEN
        RETURN 'User not found'; -- Or raise exception
    END IF;

    -- 3. Insert or Update membership
    -- We use ON CONFLICT DO NOTHING to avoid duplicates, or update role
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (target_org_id, target_user_id, target_role)
    ON CONFLICT (organization_id, user_id) 
    DO UPDATE SET role = EXCLUDED.role;
    
    RETURN 'Success';
END;
$$ LANGUAGE plpgsql;
