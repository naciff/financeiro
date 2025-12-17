-- Add financial_id column to transactions table to link back to financials/schedules
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS financial_id uuid REFERENCES public.financials(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_financial ON public.transactions(financial_id);
