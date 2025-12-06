-- Script para adicionar campos (colunas) da tabela schedules na tabela transactions
-- Este script NÃO copia dados, apenas adiciona a estrutura dos campos

-- Análise das diferenças entre as tabelas:
-- 
-- Campos que existem em SCHEDULES mas NÃO em TRANSACTIONS:
-- 1. tipo (schedule_type) - fixo ou variavel
-- 2. ano_mes_inicial (date) - data inicial do agendamento
-- 3. favorecido_id (uuid) - substitui/complementa cliente_id
-- 4. grupo_compromisso_id (uuid) - já existe em transactions ✓
-- 5. detalhes (jsonb) - informações extras
-- 6. valor (numeric) - valor único (transactions usa valor_entrada/valor_saida)
-- 7. proxima_vencimento (date) - já coberto por data_vencimento ✓
-- 8. periodo (period_type) - mensal ou anual
-- 9. parcelas (integer) - já existe em transactions ✓
-- 10. ativo (boolean) - status ativo/inativo
-- 11. created_at (timestamptz) - já existe um similar em transactions ✓

-- Campos que NÃO precisam ser adicionados:
-- - schedule_id: já existe em transactions ✓
-- - operacao: já existe ✓
-- - especie: já existe ✓
-- - historico: já existe ✓
-- - compromisso_id: já existe ✓
-- - caixa_id: já existe ✓
-- - cliente_id: já existe (favorecido_id é equivalente) ✓
-- - parcela: já existe ✓

-- ================================================================
-- CRIAR TIPOS CUSTOMIZADOS (SE NÃO EXISTIREM)
-- ================================================================

-- Verificar e criar tipo schedule_type se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'schedule_type') THEN
        CREATE TYPE schedule_type AS ENUM ('fixo', 'variavel');
    END IF;
END $$;

-- Verificar e criar tipo period_type se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'period_type') THEN
        CREATE TYPE period_type AS ENUM ('mensal', 'anual');
    END IF;
END $$;

-- ================================================================
-- ADICIONAR NOVOS CAMPOS NA TABELA TRANSACTIONS
-- ================================================================

-- 1. Adicionar campo 'tipo' (fixo ou variavel)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS tipo schedule_type;

-- 2. Adicionar campo 'ano_mes_inicial' (data inicial do agendamento)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS ano_mes_inicial date;

-- 3. Adicionar campo 'favorecido_id' (equivalente a cliente_id, mas vindo de schedules)
-- Nota: transactions já tem 'cliente_id', então favorecido_id pode ser redundante
-- Mas vou adicionar para manter compatibilidade
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS favorecido_id uuid REFERENCES clients(id) ON DELETE SET NULL;

-- 4. Adicionar campo 'detalhes' (informações extras em JSON)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS detalhes jsonb;

-- 5. Adicionar campo 'valor' (valor único, como em schedules)
-- Nota: transactions usa valor_entrada e valor_saida separados
-- Mas vou adicionar para manter compatibilidade com schedules
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS valor numeric(14,2) CHECK (valor >= 0);

-- 6. Adicionar campo 'periodo' (mensal ou anual)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS periodo period_type;

-- 7. Adicionar campo 'grupo_compromisso_id' (se não existir)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS grupo_compromisso_id uuid REFERENCES commitment_groups(id) ON DELETE SET NULL;

-- 7. Adicionar campo 'ativo' (status ativo/inativo)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;

-- 8. Adicionar campo 'created_at' (se não existir)
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- ================================================================
-- ADICIONAR COMENTÁRIOS NAS COLUNAS (DOCUMENTAÇÃO)
-- ================================================================

COMMENT ON COLUMN transactions.tipo IS 'Tipo de agendamento: fixo ou variavel (vindo de schedules)';
COMMENT ON COLUMN transactions.ano_mes_inicial IS 'Data inicial do agendamento recorrente (vindo de schedules)';
COMMENT ON COLUMN transactions.favorecido_id IS 'Referência ao favorecido/cliente (campo alternativo de schedules)';
COMMENT ON COLUMN transactions.detalhes IS 'Informações adicionais em formato JSON (vindo de schedules)';
COMMENT ON COLUMN transactions.valor IS 'Valor único da transação (campo alternativo de schedules, diferente de valor_entrada/valor_saida)';
COMMENT ON COLUMN transactions.periodo IS 'Período da recorrência: mensal ou anual (vindo de schedules)';
COMMENT ON COLUMN transactions.ativo IS 'Indica se a transação está ativa (vindo de schedules)';

-- ================================================================
-- VERIFICAR OS NOVOS CAMPOS ADICIONADOS
-- ================================================================

-- Query para listar todas as colunas da tabela transactions após as alterações
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- ================================================================
-- OBSERVAÇÕES IMPORTANTES
-- ================================================================

/*
OBSERVAÇÕES:

1. **Compatibilidade de Campos:**
   - 'favorecido_id' vs 'cliente_id': ambos referenciam a tabela 'clients'
   - 'valor' vs 'valor_entrada/valor_saida': transactions usa separado, schedules usa único
   - Você pode escolher qual usar em cada situação

2. **Campos Redundantes:**
   - Se você não precisa de 'favorecido_id', pode usar apenas 'cliente_id'
   - Se você não precisa de 'valor', pode usar apenas 'valor_entrada' e 'valor_saida'

3. **Campos que NÃO foram adicionados:**
   - 'proxima_vencimento': transactions já tem 'data_vencimento'
   - 'parcelas': transactions já tem 'parcela'

4. **Próximos Passos:**
   - Após executar este script, você pode popular esses campos copiando dados de schedules
   - Ou usar esses campos ao criar novas transactions diretamente

5. **Reversão (se necessário):**
   Para remover os campos adicionados, execute:
   
   ALTER TABLE transactions DROP COLUMN IF EXISTS tipo;
   ALTER TABLE transactions DROP COLUMN IF EXISTS ano_mes_inicial;
   ALTER TABLE transactions DROP COLUMN IF EXISTS favorecido_id;
   ALTER TABLE transactions DROP COLUMN IF EXISTS detalhes;
   ALTER TABLE transactions DROP COLUMN IF EXISTS valor;
   ALTER TABLE transactions DROP COLUMN IF EXISTS periodo;
   ALTER TABLE transactions DROP COLUMN IF EXISTS ativo;
*/
