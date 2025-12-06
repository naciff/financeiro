-- Migration: correct_periodo_check.sql
-- Description: Update the CHECK constraint on 'schedules' table to include 'semestral' in the allowed values for 'periodo'.

-- 1. Drop the existing constraint (naming convention typically "tablename_columnname_check")
ALTER TABLE public.schedules
DROP CONSTRAINT IF EXISTS schedules_periodo_check;

-- 2. Add the new constraint with 'semestral' included
ALTER TABLE public.schedules
ADD CONSTRAINT schedules_periodo_check
CHECK (periodo IN ('mensal', 'semestral', 'anual'));
