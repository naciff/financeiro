-- FUNCTION: public.has_access
-- Fixes references to non-existent columns (owner_id, member_id) in organization_members.
-- Correct column for member is 'user_id'. owner_id does not exist on organization_members.

CREATE OR REPLACE FUNCTION public.has_access(row_user_id uuid, row_org_id uuid DEFAULT NULL)
RETURNS boolean AS $$
BEGIN
  -- If org_id is provided, check if user is Owner OR Member of that organization
  IF row_org_id IS NOT NULL THEN
    RETURN (
        -- Check if user owns the organization
        EXISTS (
            SELECT 1 FROM public.organizations 
            WHERE id = row_org_id AND owner_id = auth.uid()
        )
        OR 
        -- Check if user is a member of the organization
        EXISTS (
            SELECT 1 FROM public.organization_members 
            WHERE organization_id = row_org_id 
            AND user_id = auth.uid()
        )
    );
  END IF;

  -- Fallback if no organization_id is linked to the data:
  -- Only allow if the user owns the data row directly.
  RETURN row_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
