-- Migration to add cliente and compromisso columns to transactions table

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS cliente TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS compromisso TEXT;
