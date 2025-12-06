-- Check what view or table is being used for schedules display
-- Run these queries in Supabase SQL Editor to diagnose the issue

-- 1. Check if there's a view being used
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%schedule%';

-- 2. Check the schedules table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'schedules' 
ORDER BY ordinal_position;

-- 3. Check a sample schedule to see the actual data
SELECT id, tipo, periodo, proxima_vencimento, parcelas, created_at
FROM schedules 
ORDER BY created_at DESC 
LIMIT 5;

-- 4. If there's a trigger or function that auto-generates schedule items, we need to fix it
-- This is likely the issue - check for triggers on schedules table
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'schedules';
