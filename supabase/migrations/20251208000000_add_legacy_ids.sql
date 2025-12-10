-- Migration to add legacy_id columns for data import

-- Accounts (Caixas/Contas)
ALTER TABLE accounts ADD COLUMN legacy_id BIGINT;
CREATE INDEX idx_accounts_legacy_id ON accounts(legacy_id);

-- Clients (Clientes)
ALTER TABLE clients ADD COLUMN legacy_id BIGINT;
CREATE INDEX idx_clients_legacy_id ON clients(legacy_id);

-- Commitment Groups (Grupos de Compromisso)
ALTER TABLE commitment_groups ADD COLUMN legacy_id BIGINT;
CREATE INDEX idx_commitment_groups_legacy_id ON commitment_groups(legacy_id);

-- Commitments (Compromissos)
ALTER TABLE commitments ADD COLUMN legacy_id BIGINT;
CREATE INDEX idx_commitments_legacy_id ON commitments(legacy_id);

-- Schedules (Agendamentos)
ALTER TABLE schedules ADD COLUMN legacy_id BIGINT;
CREATE INDEX idx_schedules_legacy_id ON schedules(legacy_id);

-- Financials (Lançamentos/Previsão)
ALTER TABLE financials ADD COLUMN legacy_id BIGINT;
CREATE INDEX idx_financials_legacy_id ON financials(legacy_id);

-- Transactions (Transações/Extrato)
ALTER TABLE transactions ADD COLUMN legacy_id BIGINT;
CREATE INDEX idx_transactions_legacy_id ON transactions(legacy_id);
