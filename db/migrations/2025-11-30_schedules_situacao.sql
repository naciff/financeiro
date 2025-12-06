-- Add situacao field to schedules: 1=agendado, 2=confirmado
ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS situacao SMALLINT DEFAULT 1 NOT NULL;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_situacao_allowed CHECK (situacao IN (1,2));
UPDATE public.schedules SET situacao = COALESCE(situacao, 1);
CREATE INDEX IF NOT EXISTS schedules_situacao_idx ON public.schedules(user_id, situacao);
