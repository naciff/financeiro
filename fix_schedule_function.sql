-- Fix fn_generate_schedule to handle dates correctly and set data_final only for variavel type
-- Run this in your Supabase SQL Editor

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
  SELECT * INTO sched FROM schedules WHERE id = sched_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Schedule not found';
  END IF;
  
  -- Delete existing generated items for this schedule
  DELETE FROM schedule_items WHERE schedule_id = sched_id;
  
  -- Generate items based on parcelas
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
    
    -- Calculate data_final only for tipo = 'variavel' (Prazo Determinado)
    IF sched.tipo = 'variavel' AND sched.parcelas > 1 THEN
      final_date := (sched.proxima_vencimento::date + ((sched.parcelas - 1) || ' months')::interval)::date;
    ELSE
      final_date := NULL;
    END IF;
    
    -- Insert the item
    INSERT INTO schedule_items (
      schedule_id,
      user_id,
      parcela_numero,
      vencimento,
      data_final,
      valor,
      status
    ) VALUES (
      sched_id,
      sched.user_id,
      i,
      venc_date,
      final_date,
      sched.valor / sched.parcelas,
      'pendente'
    );
  END LOOP;
END;
$$;
