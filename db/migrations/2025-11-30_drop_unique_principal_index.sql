-- Drop unique constraint on principal to allow independent toggling
DROP INDEX IF EXISTS accounts_principal_one_per_user_bool;
