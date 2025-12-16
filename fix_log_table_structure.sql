/*
  Fix transaction_logs structure mismatch 
  (Resolves "INSERT has more expressions than target columns" error when Reversing/Deleting transactions)
  Run this in Supabase SQL Editor
*/

-- 1. Drop existing objects to reset
DROP TRIGGER IF EXISTS trigger_save_deleted_transaction ON transactions;
DROP FUNCTION IF EXISTS log_transaction_deletion();
DROP TABLE IF EXISTS transaction_logs;

-- 2. Recreate Table with current structure of transactions
CREATE TABLE transaction_logs (
    LIKE transactions
);

-- 3. Add timestamp column
ALTER TABLE transaction_logs ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Recreate Function
CREATE OR REPLACE FUNCTION log_transaction_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Now OLD.* (transactions columns) + NOW() (deleted_at) matches the table structure exactly
    INSERT INTO transaction_logs SELECT OLD.*, NOW();
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 5. Recreate Trigger
CREATE TRIGGER trigger_save_deleted_transaction
BEFORE DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION log_transaction_deletion();
