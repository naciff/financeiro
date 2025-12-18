-- Admin Functions for DB Manager Page

-- 1. Get System Statistics
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE (
  total_users bigint,
  total_organizations bigint,
  total_transactions bigint,
  total_accounts bigint,
  db_size text
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_email text;
BEGIN
    SELECT email INTO current_email FROM auth.users WHERE id = auth.uid();
    IF current_email <> 'ramon.naciff@gmail.com' THEN
        RAISE EXCEPTION 'Access Denied';
    END IF;

    RETURN QUERY
    SELECT 
        (SELECT count(*) FROM auth.users) as total_users,
        (SELECT count(*) FROM public.organizations) as total_organizations,
        (SELECT count(*) FROM public.financials) as total_transactions,
        (SELECT count(*) FROM public.accounts) as total_accounts,
        pg_size_pretty(pg_database_size(current_database())) as db_size;
END;
$$ LANGUAGE plpgsql;

-- 2. Execute Arbitrary SQL (Dangerous - Restricted to Master User)
CREATE OR REPLACE FUNCTION public.exec_sql_admin(query_text text)
RETURNS text
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_email text;
    result_text text;
BEGIN
    SELECT email INTO current_email FROM auth.users WHERE id = auth.uid();
    
    IF current_email <> 'ramon.naciff@gmail.com' THEN
        RAISE EXCEPTION 'Access Denied: Only Master User can execute SQL.';
    END IF;

    -- Execute the query
    -- Note: This blindly executes whatever is passed. 
    -- It allows Select, Update, Delete, Drop, etc.
    EXECUTE query_text;
    
    RETURN 'Success';
EXCEPTION
    WHEN OTHERS THEN
        RETURN SQLERRM;
END;
$$ LANGUAGE plpgsql;
