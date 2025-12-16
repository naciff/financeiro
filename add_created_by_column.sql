-- Add created_by column to track who created the record
-- Tables: clients, accounts, commitments, commitment_groups, schedules, transactions

-- 1. Clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
UPDATE public.clients SET created_by = user_id WHERE created_by IS NULL;

-- 2. Accounts
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
UPDATE public.accounts SET created_by = user_id WHERE created_by IS NULL;

-- 3. Commitments
ALTER TABLE public.commitments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
UPDATE public.commitments SET created_by = user_id WHERE created_by IS NULL;

-- 4. Commitment Groups
ALTER TABLE public.commitment_groups ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
UPDATE public.commitment_groups SET created_by = user_id WHERE created_by IS NULL;

-- 5. Schedules
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
UPDATE public.schedules SET created_by = user_id WHERE created_by IS NULL;

-- 6. Transactions
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
UPDATE public.transactions SET created_by = user_id WHERE created_by IS NULL;

-- 7. Grant access to 'created_by' column if needed (usually automatic for owners, but explicit for members might be needed)
-- Since we are just adding a column, existing RLS policies should cover it as long as they select (*).

-- Notify to refresh schema cache
NOTIFY pgrst, 'reload config';
