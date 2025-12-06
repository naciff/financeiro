ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_agencia_fmt;
ALTER TABLE accounts ADD CONSTRAINT accounts_agencia_fmt CHECK (agencia IS NULL OR agencia ~ '^[0-9]{5}$');
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_conta_fmt;
ALTER TABLE accounts ADD CONSTRAINT accounts_conta_fmt CHECK (conta IS NULL OR conta ~ '^[0-9]{6}$');
