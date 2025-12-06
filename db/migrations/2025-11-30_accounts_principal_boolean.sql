-- Change principal column to boolean to avoid bit string errors
ALTER TABLE public.accounts
  ALTER COLUMN principal TYPE boolean USING (principal = B'1');
ALTER TABLE public.accounts
  ALTER COLUMN principal SET DEFAULT false;
-- Replace unique index to use boolean
DROP INDEX IF EXISTS accounts_principal_one_per_user;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_principal_one_per_user_bool ON public.accounts(user_id) WHERE principal = true;
