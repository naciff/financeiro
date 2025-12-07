-- Fix limits for operacao (retirada is 8 chars) and ano_mes_inicial (YYYY-MM-DD support)

-- 1. Schedules
DO $$ BEGIN
  -- Alter operacao to TEXT to accept 'retirada' (8 chars)
  EXECUTE 'ALTER TABLE schedules ALTER COLUMN operacao TYPE TEXT';
  
  -- Alter ano_mes_inicial to VARCHAR(10) to accept 'YYYY-MM-DD' if needed
  EXECUTE 'ALTER TABLE schedules ALTER COLUMN ano_mes_inicial TYPE VARCHAR(10)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error altering schedules: %', SQLERRM;
END $$;

-- 2. Transactions
DO $$ BEGIN
  EXECUTE 'ALTER TABLE transactions ALTER COLUMN operacao TYPE TEXT';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error altering transactions: %', SQLERRM;
END $$;

-- 3. Livro Financeiro
DO $$ BEGIN
  EXECUTE 'ALTER TABLE livro_financeiro ALTER COLUMN operacao TYPE TEXT'; -- Already TEXT but ensuring
  EXECUTE 'ALTER TABLE livro_financeiro ALTER COLUMN ano_mes_inicial TYPE VARCHAR(10)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error altering livro_financeiro: %', SQLERRM;
END $$;
