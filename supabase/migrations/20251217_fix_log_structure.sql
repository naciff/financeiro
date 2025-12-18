-- Rebuild transaction_logs to match current transactions schema
-- This fixes the error "expression is of type schedule_type" during deletion/reversal

-- 1. Drop existing objects
DROP TRIGGER IF EXISTS trigger_save_deleted_transaction ON public.transactions;
DROP FUNCTION IF EXISTS log_transaction_deletion();
DROP TABLE IF EXISTS public.transaction_logs;

-- 2. Recreate Table with CURRENT structure of transactions
CREATE TABLE public.transaction_logs (
    LIKE public.transactions
);

-- 3. Add timestamp column for deletion time
ALTER TABLE public.transaction_logs ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Recreate Function
CREATE OR REPLACE FUNCTION log_transaction_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Now OLD.* (transactions columns) + NOW() (deleted_at) matches the table structure exactly
    INSERT INTO public.transaction_logs SELECT OLD.*, NOW();
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 5. Recreate Trigger
CREATE TRIGGER trigger_save_deleted_transaction
BEFORE DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION log_transaction_deletion();
