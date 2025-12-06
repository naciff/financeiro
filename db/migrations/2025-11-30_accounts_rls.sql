-- Enable RLS and ensure policies exist for accounts table
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'Permitir INSERT para usuário autenticado'
  ) THEN
    EXECUTE 'CREATE POLICY "Permitir INSERT para usuário autenticado" ON accounts FOR INSERT WITH CHECK (auth.uid() = user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'Permitir SELECT para usuário autenticado'
  ) THEN
    EXECUTE 'CREATE POLICY "Permitir SELECT para usuário autenticado" ON accounts FOR SELECT USING (auth.uid() = user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'Permitir UPDATE para usuário autenticado'
  ) THEN
    EXECUTE 'CREATE POLICY "Permitir UPDATE para usuário autenticado" ON accounts FOR UPDATE USING (auth.uid() = user_id)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'Permitir DELETE para usuário autenticado'
  ) THEN
    EXECUTE 'CREATE POLICY "Permitir DELETE para usuário autenticado" ON accounts FOR DELETE USING (auth.uid() = user_id)';
  END IF;
END $$;

