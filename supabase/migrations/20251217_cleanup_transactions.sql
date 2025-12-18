-- Migration to cleanup unused columns from transactions table
-- and fix RPC functions that still reference the removed 'status' column.

-- 1. Fix fn_transfer (Remove status)
CREATE OR REPLACE FUNCTION fn_transfer(source uuid, dest uuid, amount numeric, d date, descricao text)
RETURNS uuid AS $$
DECLARE tid uuid := gen_random_uuid();
BEGIN
  -- Insert outflow (saída)
  INSERT INTO transactions(user_id, conta_id, operacao, historico, data_vencimento, data_lancamento, valor_saida, transfer_id, concluido_em)
  VALUES (auth.uid(), source, 'transferencia', descricao, d, COALESCE(d, (now() AT TIME ZONE 'utc')::date), amount, tid, now());
  
  -- Insert inflow (entrada)
  INSERT INTO transactions(user_id, conta_id, operacao, historico, data_vencimento, data_lancamento, valor_entrada, transfer_id, concluido_em)
  VALUES (auth.uid(), dest, 'transferencia', descricao, d, COALESCE(d, (now() AT TIME ZONE 'utc')::date), amount, tid, now());
  
  RETURN tid;
END; $$ LANGUAGE plpgsql SECURITY INVOKER;

-- 2. Fix fn_pay (Remove status update)
CREATE OR REPLACE FUNCTION fn_pay(tx_id uuid, conta uuid, amount numeric, d date)
RETURNS uuid AS $$
BEGIN
  UPDATE transactions 
  SET conta_id = conta, valor_saida = amount, data_lancamento = COALESCE(d, data_lancamento), concluido_em = now()
  -- status = 'pago' removed
  WHERE id = tx_id AND user_id = auth.uid() AND operacao IN ('despesa','retirada');
  
  RETURN tx_id;
END; $$ LANGUAGE plpgsql SECURITY INVOKER;

-- 3. Cleanup redundant columns
ALTER TABLE transactions 
  DROP COLUMN IF EXISTS caixa_id,
  DROP COLUMN IF EXISTS favorecido_id,
  DROP COLUMN IF EXISTS valor,
  DROP COLUMN IF EXISTS tipo,
  DROP COLUMN IF EXISTS ano_mes_inicial,
  DROP COLUMN IF EXISTS periodo,
  DROP COLUMN IF EXISTS ativo,
  DROP COLUMN IF EXISTS parcela,
  DROP COLUMN IF EXISTS cost_center_id,
  DROP COLUMN IF EXISTS schedule_id;

-- 4. Rebuild transaction_logs to match new structure
-- This prevents "column type mismatch" errors during deletion/reversal
DROP TRIGGER IF EXISTS trigger_save_deleted_transaction ON transactions;
DROP FUNCTION IF EXISTS log_transaction_deletion();
DROP TABLE IF EXISTS transaction_logs;

CREATE TABLE transaction_logs (
    LIKE transactions
);

ALTER TABLE transaction_logs ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE OR REPLACE FUNCTION log_transaction_deletion()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO transaction_logs SELECT OLD.*, NOW();
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_save_deleted_transaction
BEFORE DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION log_transaction_deletion();
