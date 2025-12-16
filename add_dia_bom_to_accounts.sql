-- Add dia_bom column to accounts table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'dia_bom') THEN
        ALTER TABLE accounts ADD COLUMN dia_bom INTEGER;
    END IF;
END $$;
