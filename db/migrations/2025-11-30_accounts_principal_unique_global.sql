-- Ensure only one principal account per user, regardless of type
DROP INDEX IF EXISTS accounts_principal_unique;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_principal_one_per_user ON accounts(user_id) WHERE principal = B'1';
