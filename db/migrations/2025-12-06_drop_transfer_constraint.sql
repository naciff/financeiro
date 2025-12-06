-- Migration to drop problematic unique constraint on transactions
-- Created: 2025-12-06
-- Description: Drops the transactions_transfer_unique_idx which prevents creating paired transfer records (debit/credit) with the same transfer_id.

DROP INDEX IF EXISTS transactions_transfer_unique_idx;
