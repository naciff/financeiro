-- Script para copiar dados de agendamentos (schedules) para livro caixa (transactions)
-- Copia todas as colunas compatíveis
-- O status será definido como 'pendente' por padrão

-- IMPORTANTE: Este script cria transações a partir dos agendamentos existentes
-- Como não há campo schedule_id na tabela transactions, não é possível verificar duplicatas automaticamente
-- Recomenda-se verificar manualmente antes de executar

-- Opção 1: Copiar todos os agendamentos como transações pendentes
INSERT INTO transactions (
  user_id,
  operacao,
  especie,
  historico,
  caixa_id,
  compromisso_id,
  cliente_id,
  data_vencimento,
  data_lancamento,
  valor_entrada,
  valor_saida,
  parcela,
  status
)
SELECT 
  s.user_id,
  s.operacao,
  s.especie,
  s.historico,
  s.caixa_id,
  s.compromisso_id,
  s.favorecido_id as cliente_id,
  s.proxima_vencimento as data_vencimento,
  CURRENT_DATE as data_lancamento,
  CASE 
    WHEN s.operacao IN ('receita', 'aporte') THEN s.valor 
    ELSE 0 
  END as valor_entrada,
  CASE 
    WHEN s.operacao IN ('despesa', 'retirada') THEN s.valor 
    ELSE 0 
  END as valor_saida,
  1 as parcela,
  'pendente' as status
FROM schedules s;

-- Opção 2: Copiar apenas agendamentos específicos (com filtro por data)
-- Descomente as linhas abaixo e ajuste as datas conforme necessário
/*
INSERT INTO transactions (
  user_id,
  operacao,
  especie,
  historico,
  caixa_id,
  compromisso_id,
  cliente_id,
  data_vencimento,
  data_lancamento,
  valor_entrada,
  valor_saida,
  parcela,
  status
)
SELECT 
  s.user_id,
  s.operacao,
  s.especie,
  s.historico,
  s.caixa_id,
  s.compromisso_id,
  s.favorecido_id as cliente_id,
  s.proxima_vencimento as data_vencimento,
  CURRENT_DATE as data_lancamento,
  CASE 
    WHEN s.operacao IN ('receita', 'aporte') THEN s.valor 
    ELSE 0 
  END as valor_entrada,
  CASE 
    WHEN s.operacao IN ('despesa', 'retirada') THEN s.valor 
    ELSE 0 
  END as valor_saida,
  1 as parcela,
  'pendente' as status
FROM schedules s
WHERE s.proxima_vencimento >= '2025-12-01'  -- Ajuste a data conforme necessário
  AND s.proxima_vencimento <= '2025-12-31';  -- Ajuste a data conforme necessário
*/

-- Opção 3: Gerar múltiplas parcelas para agendamentos variáveis
-- Este script gera todas as parcelas de um agendamento do tipo 'variavel'
/*
INSERT INTO transactions (
  user_id,
  operacao,
  especie,
  historico,
  caixa_id,
  compromisso_id,
  cliente_id,
  data_vencimento,
  data_lancamento,
  valor_entrada,
  valor_saida,
  parcela,
  status
)
SELECT 
  s.user_id,
  s.operacao,
  s.especie,
  s.historico,
  s.caixa_id,
  s.compromisso_id,
  s.favorecido_id as cliente_id,
  -- Calcula a data de vencimento de cada parcela
  (CASE 
    WHEN s.periodo = 'mensal' THEN s.ano_mes_inicial + (parcela_num || ' months')::INTERVAL
    ELSE s.ano_mes_inicial + (parcela_num || ' years')::INTERVAL
  END)::DATE as data_vencimento,
  CURRENT_DATE as data_lancamento,
  CASE 
    WHEN s.operacao IN ('receita', 'aporte') THEN s.valor 
    ELSE 0 
  END as valor_entrada,
  CASE 
    WHEN s.operacao IN ('despesa', 'retirada') THEN s.valor 
    ELSE 0 
  END as valor_saida,
  parcela_num + 1 as parcela,
  'pendente' as status
FROM schedules s
CROSS JOIN generate_series(0, COALESCE(s.parcelas, 1) - 1) as parcela_num
WHERE s.tipo = 'variavel';
*/

-- Verificar quantos registros serão copiados (execute antes do INSERT para conferir)
SELECT 
  COUNT(*) as total_agendamentos,
  SUM(CASE WHEN s.tipo = 'fixo' THEN 1 ELSE 0 END) as agendamentos_fixos,
  SUM(CASE WHEN s.tipo = 'variavel' THEN 1 ELSE 0 END) as agendamentos_variaveis,
  SUM(CASE WHEN s.operacao = 'receita' THEN 1 ELSE 0 END) as receitas,
  SUM(CASE WHEN s.operacao = 'despesa' THEN 1 ELSE 0 END) as despesas
FROM schedules s;

-- Verificar transações existentes para evitar duplicatas manualmente
SELECT 
  COUNT(*) as total_transacoes_existentes,
  SUM(CASE WHEN operacao = 'receita' THEN 1 ELSE 0 END) as receitas,
  SUM(CASE WHEN operacao = 'despesa' THEN 1 ELSE 0 END) as despesas
FROM transactions;
