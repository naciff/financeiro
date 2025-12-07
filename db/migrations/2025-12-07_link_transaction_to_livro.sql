-- Add linkage between transactions and livro_financeiro
-- This allows us to trace a transaction back to the installment it paid, enable reversals (estorno), etc.

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS livro_financeiro_id UUID REFERENCES livro_financeiro(id_livro) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_livro_id ON transactions(livro_financeiro_id);
