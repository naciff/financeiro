-- Data de vencimento obrigatória para tipo 'cartao'
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER;

-- Dia de vencimento obrigatório e no intervalo 1..31 quando tipo = 'cartao'
ALTER TABLE accounts ADD CONSTRAINT accounts_cartao_vencimento_required CHECK (tipo <> 'cartao' OR dia_vencimento IS NOT NULL);
ALTER TABLE accounts ADD CONSTRAINT accounts_cartao_vencimento_range CHECK (tipo <> 'cartao' OR (dia_vencimento BETWEEN 1 AND 31));

-- Index para consultas por vencimento (opcional)
CREATE INDEX IF NOT EXISTS accounts_vencimento_idx ON accounts(user_id, tipo, dia_vencimento) WHERE tipo = 'cartao';
