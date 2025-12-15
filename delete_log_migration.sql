-- Script para criar tabela de log de exclusão do Livro Caixa (transactions)

-- 1. Criar a tabela de logs copiando a estrutura da tabela transactions (sem dados)
-- O uso de "LIKE transactions" garante que os campos sejam idênticos.
CREATE TABLE IF NOT EXISTS transaction_logs (
    LIKE transactions
);

-- 2. Adicionar a coluna de data de exclusão se ela ainda não existir
ALTER TABLE transaction_logs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Função do Gatilho (Trigger Function)
-- Esta função será executada antes de qualquer exclusão na tabela transactions
CREATE OR REPLACE FUNCTION log_transaction_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Insere o registro antigo (OLD) na tabela transaction_logs
    -- Adiciona a data atual (NOW()) na coluna deleted_at
    -- Nota: Esta sintaxe assume que 'deleted_at' é a última coluna da taela de logs.
    INSERT INTO transaction_logs SELECT OLD.*, NOW();
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar o Gatilho (Trigger) na tabela transactions
DROP TRIGGER IF EXISTS trigger_save_deleted_transaction ON transactions;

CREATE TRIGGER trigger_save_deleted_transaction
BEFORE DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION log_transaction_deletion();

-- Comentário:
-- A tabela 'transaction_logs' agora manterá uma cópia de qualquer item excluído de 'transactions',
-- juntamente com o carimbo de data/hora da exclusão em 'deleted_at'.
