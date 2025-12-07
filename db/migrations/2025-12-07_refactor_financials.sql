-- Rename table and columns to follow standard conventions

-- 1. Rename Table
ALTER TABLE IF EXISTS livro_financeiro RENAME TO financials;

-- 2. Rename Primary Key Column
ALTER TABLE financials RENAME COLUMN id_livro TO id;

-- 3. Rename Foreign Key Column in Transactions
ALTER TABLE transactions RENAME COLUMN livro_financeiro_id TO financial_id;

-- 4. Re-create Indexes (Postgres usually handles rename, but let's be safe/explicit if needed for new names)
-- Renaming indexes for consistency
ALTER INDEX IF EXISTS idx_livro_financeiro_user_id RENAME TO idx_financials_user_id;
ALTER INDEX IF EXISTS idx_livro_financeiro_agendamento RENAME TO idx_financials_schedule_id;
ALTER INDEX IF EXISTS idx_livro_financeiro_vencimento RENAME TO idx_financials_vencimento;
ALTER INDEX IF EXISTS idx_livro_financeiro_situacao RENAME TO idx_financials_situacao;
ALTER INDEX IF EXISTS idx_transactions_livro_id RENAME TO idx_transactions_financial_id;
