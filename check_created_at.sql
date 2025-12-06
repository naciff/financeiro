-- Check the created_at and ano_mes_inicial values in schedules table
-- Run this in Supabase SQL Editor

-- 1. Check recent schedules to see the actual values
SELECT 
  id,
  created_at,
  ano_mes_inicial,
  created_at::date as created_date,
  ano_mes_inicial::date as ano_mes_date
FROM schedules 
ORDER BY created_at DESC 
LIMIT 10;

-- 2. If created_at has timezone offset, we can fix it by ensuring ano_mes_inicial is set correctly
-- The issue is that created_at is a timestamp with timezone, which gets converted

-- 3. To fix: Update the schedules to use ano_mes_inicial as the reference date
-- This query shows which schedules have mismatched dates
SELECT 
  id,
  created_at::date as created_date,
  ano_mes_inicial::date as ano_mes_date,
  CASE 
    WHEN created_at::date != ano_mes_inicial::date THEN 'MISMATCH'
    ELSE 'OK'
  END as status
FROM schedules 
WHERE created_at::date != ano_mes_inicial::date
ORDER BY created_at DESC;
