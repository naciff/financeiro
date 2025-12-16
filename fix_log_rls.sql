/*
  Fix RLS Policy for transaction_logs
  ERROR: new row violates row-level security policy for table "transaction_logs"
  
  This table is populated by a trigger when a transaction is deleted.
  The user performing the DELETE needs permission to INSERT into the log table.
*/

ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own logs" ON transaction_logs;
DROP POLICY IF EXISTS "Users can view their own logs" ON transaction_logs;

-- Allow Insert (Trigger runs as user)
CREATE POLICY "Users can insert their own logs"
ON transaction_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow Select (Optional, for auditing view)
CREATE POLICY "Users can view their own logs"
ON transaction_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow Update/Delete? Generally logs should be immutable, but if RLS is strict...
-- For now, INSERT is the critical one for the Trigger.
