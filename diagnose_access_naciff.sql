-- DIAGNOSE ACCESS FOR CLARISSA / NACIFF (Result Grid Version)
WITH 
  target_org AS (
    SELECT id, name, owner_id FROM public.organizations WHERE name = 'Naciff' LIMIT 1
  ),
  target_user AS (
    SELECT id, email FROM auth.users WHERE email = 'clarissa.naciff@gmail.com' LIMIT 1
  ),
  membership_check AS (
    SELECT 
        om.role,
        om.permissions
    FROM public.organization_members om
    JOIN target_org o ON o.id = om.organization_id
    JOIN target_user u ON u.id = om.user_id
  )
SELECT 
    o.name as organization_name,
    o.id as organization_id,
    u.email as user_email,
    u.id as user_id,
    CASE 
        WHEN o.owner_id = u.id THEN 'OWNER'
        WHEN m.role IS NOT NULL THEN 'MEMBER (' || m.role || ')'
        ELSE 'NOT A MEMBER' 
    END as membership_status,
    (SELECT count(*) FROM public.transactions t WHERE t.organization_id = o.id) as transactions_count,
    (SELECT count(*) FROM public.schedules s WHERE s.organization_id = o.id) as schedules_count,
    (SELECT count(*) FROM public.financials f WHERE f.organization_id = o.id) as financials_count
FROM target_org o
CROSS JOIN target_user u
LEFT JOIN membership_check m ON true;
