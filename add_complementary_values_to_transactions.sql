/* 
  Add complementary values to transactions table 
*/

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'descontos') THEN
        ALTER TABLE public.transactions ADD COLUMN descontos numeric(14,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'multa') THEN
        ALTER TABLE public.transactions ADD COLUMN multa numeric(14,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'juros') THEN
        ALTER TABLE public.transactions ADD COLUMN juros numeric(14,2) NOT NULL DEFAULT 0;
    END IF;
END $$;
