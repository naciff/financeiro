-- Migration to add cost_center_id to transactions and update trigger propagation
-- 1. Add column to transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id);

-- 2. Update existing transactions from their related financials (if any) or agendamentos
-- Note: 'financial_id' column was mentioned in confirmProvision implementation
UPDATE public.transactions t
SET cost_center_id = f.cost_center_id
FROM public.financials f
WHERE t.financial_id = f.id
AND t.cost_center_id IS NULL 
AND f.cost_center_id IS NOT NULL;

-- If no financial_id link, try searching by other criteria if needed, but the column addition is the priority.
