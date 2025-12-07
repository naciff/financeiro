-- Add Relational ID columns to transactions table for data integrity

-- 1. Cliente / Favorecido ID
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- 2. Compromisso ID
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS compromisso_id UUID REFERENCES commitments(id) ON DELETE SET NULL;

-- 3. Index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_cliente_id ON transactions(cliente_id);
CREATE INDEX IF NOT EXISTS idx_transactions_compromisso_id ON transactions(compromisso_id);
