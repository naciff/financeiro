-- Add principal flag to accounts and ensure uniqueness per user and type
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS principal BIT(1) DEFAULT B'0';

-- Unique principal per (user_id, tipo)
CREATE UNIQUE INDEX IF NOT EXISTS accounts_principal_unique ON accounts(user_id, tipo) WHERE principal = B'1';

-- Optional: ensure column exists for situation if not already present
-- ALTER TABLE accounts ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT TRUE;
