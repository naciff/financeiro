-- Fix missing organization_id in fn_generate_schedule
-- UPDATED: Includes DROP FUNCTION to handle return type change error (integer -> void)

-- 1. Drop the function first to allow return type change
DROP FUNCTION IF EXISTS fn_generate_schedule(uuid);

-- 2. Recreate the function properly
CREATE OR REPLACE FUNCTION fn_generate_schedule(sched_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sched RECORD;
  i INT;
  venc_date DATE;
  final_date DATE;
BEGIN
  -- Get the schedule
  -- IMPORTANT: Removed user_id filter to allow service role / org usage if needed, or rely on RLS
  SELECT * INTO sched FROM schedules WHERE id = sched_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found';
  END IF;
  
  -- Delete existing PENDING items for this schedule (Cleanup old logic if any)
  DELETE FROM financials WHERE id_agendamento = sched_id AND situacao = 1;

  -- Generate items
  FOR i IN 1..sched.parcelas LOOP
    -- Calculate vencimento date
    IF sched.periodo = 'mensal' THEN
      venc_date := (sched.proxima_vencimento::date + ((i - 1) || ' months')::interval)::date;
    ELSIF sched.periodo = 'anual' THEN
      venc_date := (sched.proxima_vencimento::date + ((i - 1) || ' years')::interval)::date;
    ELSE
      -- For prazo determinado (variavel), distribute evenly
      venc_date := (sched.proxima_vencimento::date + ((i - 1) || ' months')::interval)::date;
    END IF;

    INSERT INTO financials (
      id_agendamento,
      user_id,
      organization_id, -- ADDED
      operacao,
      historico,
      especie,
      caixa_id,
      favorecido_id,
      ano_mes_inicial,
      valor,
      data_vencimento,
      situacao
    ) VALUES (
      sched_id,
      sched.user_id,
      sched.organization_id, -- ADDED
      sched.operacao,
      COALESCE(sched.historico, 'Parcela ' || i || '/' || sched.parcelas),
      sched.especie,
      sched.caixa_id,
      sched.favorecido_id,
      sched.ano_mes_inicial,
      sched.valor / sched.parcelas, -- Prorate value
      venc_date,
      1 -- Pendente
    );
  END LOOP;
END;
$$;
