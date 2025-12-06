-- Define status (situação) values and constraints
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE NOT NULL;

-- Allowed tipos for accounts
ALTER TABLE accounts ADD CONSTRAINT accounts_tipo_allowed CHECK (tipo IN ('banco','carteira','cartao'));

-- Batch update example: set all NULLs to TRUE (if present on legacy)
UPDATE accounts SET ativo = TRUE WHERE ativo IS NULL;

-- Index to optimize queries filtering by user and status
CREATE INDEX IF NOT EXISTS accounts_user_status_idx ON accounts(user_id, ativo);
