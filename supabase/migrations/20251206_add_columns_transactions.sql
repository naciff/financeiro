-- Migration to add nota_fiscal and detalhes to transactions table

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS nota_fiscal TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS detalhes TEXT;
