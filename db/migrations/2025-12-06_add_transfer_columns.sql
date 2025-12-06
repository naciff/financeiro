-- Migration to add missing columns for transfers
-- Created: 2025-12-06
-- Description: Adds transfer_id and concluido_em columns to transactions table if they don't exist.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'transfer_id') THEN
        ALTER TABLE transactions ADD COLUMN transfer_id uuid;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'concluido_em') THEN
        ALTER TABLE transactions ADD COLUMN concluido_em timestamptz;
    END IF;
END $$;

-- Drop index if exists to avoid error on creation
DROP INDEX IF EXISTS transactions_user_id_transfer_id_operacao_idx;

-- Create unique index for transfers logic
CREATE UNIQUE INDEX IF NOT EXISTS transactions_transfer_unique_idx ON transactions (user_id, transfer_id, operacao) WHERE operacao = 'transferencia';
