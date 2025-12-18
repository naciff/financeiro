-- Function to update organization name (Admin only)
CREATE OR REPLACE FUNCTION public.update_organization_name_admin(target_org_id uuid, new_name text)
RETURNS text
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_email text;
BEGIN
    -- 1. Check Admin Permissions
    current_email := auth.jwt() ->> 'email';
    
    IF TRIM(LOWER(current_email)) <> 'ramon.naciff@gmail.com' THEN
        RAISE EXCEPTION 'Access Denied: Only Master User can perform this action.';
    END IF;

    -- 2. Update
    UPDATE public.organizations
    SET name = new_name
    WHERE id = target_org_id;

    RETURN 'Success';
END;
$$ LANGUAGE plpgsql;
