-- Enable RLS for transaction_logs
-- This table was recently recreated and needs security policies
ALTER TABLE public.transaction_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see their own deleted transactions
DROP POLICY IF EXISTS "Users can see their own transaction logs" ON public.transaction_logs;
CREATE POLICY "Users can see their own transaction logs" 
ON public.transaction_logs
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy to allow system logic (functions) to insert logs
-- Since the trigger runs with the permissions of the user performing the delete,
-- and the trigger function is SECURITY INVOKER by default,
-- we need an insert policy or make the function SECURITY DEFINER.
-- However, we already have an INSERT policy for the 'transactions' table for the user.
-- Let's add an INSERT policy for transaction_logs as well.
DROP POLICY IF EXISTS "Users can insert their own transaction logs" ON public.transaction_logs;
CREATE POLICY "Users can insert their own transaction logs" 
ON public.transaction_logs
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
