ALTER TABLE accounts ADD COLUMN IF NOT EXISTS banco_codigo VARCHAR(3);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS agencia VARCHAR(6);
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS conta VARCHAR(7);

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_banco_codigo_fmt;
ALTER TABLE accounts ADD CONSTRAINT accounts_banco_codigo_fmt CHECK (banco_codigo IS NULL OR banco_codigo ~ '^[0-9]{3}$');

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_agencia_fmt;
ALTER TABLE accounts ADD CONSTRAINT accounts_agencia_fmt CHECK (agencia IS NULL OR agencia ~ '^[0-9]{4}-[0-9]$');

ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_conta_fmt;
ALTER TABLE accounts ADD CONSTRAINT accounts_conta_fmt CHECK (conta IS NULL OR conta ~ '^[0-9]{5}-[0-9X]$');
