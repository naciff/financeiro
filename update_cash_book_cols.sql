/* 
  Add complementary values (descontos, juros, multa) to transactions and financials tables 
  Run this in Supabase SQL Editor
*/

DO $$
BEGIN
    -- 1. Add columns to 'transactions' table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'descontos') THEN
        ALTER TABLE public.transactions ADD COLUMN descontos numeric(14,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'multa') THEN
        ALTER TABLE public.transactions ADD COLUMN multa numeric(14,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'juros') THEN
        ALTER TABLE public.transactions ADD COLUMN juros numeric(14,2) NOT NULL DEFAULT 0;
    END IF;

    -- 2. Add columns to 'financials' (Low code cash book) table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financials' AND column_name = 'descontos') THEN
        ALTER TABLE public.financials ADD COLUMN descontos numeric(14,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financials' AND column_name = 'multa') THEN
        ALTER TABLE public.financials ADD COLUMN multa numeric(14,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financials' AND column_name = 'juros') THEN
        ALTER TABLE public.financials ADD COLUMN juros numeric(14,2) NOT NULL DEFAULT 0;
    END IF;

END $$;
