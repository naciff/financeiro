ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_caixa_id_fkey;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'schedules' AND column_name = 'caixa_id' AND data_type = 'uuid'
  ) THEN
    EXECUTE 'ALTER TABLE public.schedules ALTER COLUMN caixa_id TYPE uuid USING (NULLIF(caixa_id, '''')::uuid)';
  END IF;
END $$;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_caixa_id_fkey FOREIGN KEY (caixa_id) REFERENCES public.accounts(id) ON UPDATE CASCADE ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS schedules_caixa_id_idx ON public.schedules(caixa_id);
