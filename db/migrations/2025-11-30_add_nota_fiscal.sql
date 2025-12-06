-- Adiciona coluna nota_fiscal à tabela de agendamentos
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS nota_fiscal NUMERIC(15);

-- Opcional: índice para consultas por nota fiscal
-- CREATE INDEX IF NOT EXISTS idx_schedules_nota_fiscal ON schedules(nota_fiscal);
