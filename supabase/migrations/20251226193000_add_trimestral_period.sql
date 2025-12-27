-- Migration to add trimestral and other missing period types

-- Add missing enum values to period_type (in case it is an enum)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'period_type' AND e.enumlabel = 'semanal') THEN
        ALTER TYPE period_type ADD VALUE 'semanal';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'period_type' AND e.enumlabel = 'quinzenal') THEN
        ALTER TYPE period_type ADD VALUE 'quinzenal';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'period_type' AND e.enumlabel = 'bimestral') THEN
        ALTER TYPE period_type ADD VALUE 'bimestral';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'period_type' AND e.enumlabel = 'trimestral') THEN
        ALTER TYPE period_type ADD VALUE 'trimestral';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'period_type' AND e.enumlabel = 'semestral') THEN
        ALTER TYPE period_type ADD VALUE 'semestral';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'period_type' AND e.enumlabel = 'unico') THEN
        ALTER TYPE period_type ADD VALUE 'unico';
    END IF;
END
$$;

-- Drop and recreate the CHECK constraint to include new values
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_periodo_check;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_periodo_check 
CHECK (periodo::text IN ('mensal', 'semanal', 'quinzenal', 'bimestral', 'trimestral', 'semestral', 'anual', 'unico'));

-- Update fn_generate_schedule to handle ALL period types
DROP FUNCTION IF EXISTS public.fn_generate_schedule(uuid);

CREATE OR REPLACE FUNCTION public.fn_generate_schedule(sched_id uuid)
RETURNS integer as $$
declare s schedules%rowtype; cnt integer;
begin
  select * into s from schedules where id=sched_id and user_id=auth.uid();
  if s.id is null then return 0; end if;
  with seq as (
    select generate_series(0, coalesce(s.parcelas,1)-1) as i
  ), ins as (
    insert into transactions(user_id, schedule_id, operacao, especie, historico, caixa_id, data_vencimento, valor_entrada, valor_saida, parcela, status)
    select auth.uid(), s.id, s.operacao, s.especie, s.historico, s.caixa_id,
           (case 
             when s.periodo='semanal' then s.ano_mes_inicial + (i*7||' days')::interval
             when s.periodo='quinzenal' then s.ano_mes_inicial + (i*15||' days')::interval
             when s.periodo='mensal' then s.ano_mes_inicial + (i||' months')::interval 
             when s.periodo='bimestral' then s.ano_mes_inicial + (i*2||' months')::interval
             when s.periodo='trimestral' then s.ano_mes_inicial + (i*3||' months')::interval
             when s.periodo='semestral' then s.ano_mes_inicial + (i*6||' months')::interval
             when s.periodo='anual' then s.ano_mes_inicial + (i||' years')::interval
             else s.ano_mes_inicial -- single or default
            end)::date,
           case when s.operacao in ('receita','aporte') then s.valor else 0 end,
           case when s.operacao in ('despesa','retirada') then s.valor else 0 end,
           i+1,
           'pendente'
    from seq
    returning 1
  )
  select count(*) into cnt from ins;
  
  update schedules set proxima_vencimento = (case 
    when s.periodo='semanal' then s.ano_mes_inicial + (coalesce(s.parcelas,1)*7)::text||' days'::interval
    when s.periodo='quinzenal' then s.ano_mes_inicial + (coalesce(s.parcelas,1)*15)::text||' days'::interval
    when s.periodo='mensal' then s.ano_mes_inicial + (coalesce(s.parcelas,1))::text||' months'::interval 
    when s.periodo='bimestral' then s.ano_mes_inicial + (coalesce(s.parcelas,1)*2)::text||' months'::interval
    when s.periodo='trimestral' then s.ano_mes_inicial + (coalesce(s.parcelas,1)*3)::text||' months'::interval
    when s.periodo='semestral' then s.ano_mes_inicial + (coalesce(s.parcelas,1)*6)::text||' months'::interval
    when s.periodo='anual' then s.ano_mes_inicial + (coalesce(s.parcelas,1))::text||' years'::interval 
    else s.ano_mes_inicial -- single
  end)::date
  where id=s.id;
  
  return coalesce(cnt,0);
end; $$ language plpgsql security invoker;

-- Update the trigger function that syncs schedules to the financials (forecast) table
CREATE OR REPLACE FUNCTION public.fn_sync_schedules_to_financials()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_parcelas INTEGER;
    v_periodo INTERVAL;
    v_base_date DATE;
    v_desc TEXT;
    v_cc_count INTEGER;
    v_cc RECORD;
    v_split_valor NUMERIC;
BEGIN
    -- 1. Handle UPDATE or INSERT:
    IF TG_OP = 'UPDATE' THEN
        DELETE FROM financials 
        WHERE id_agendamento = NEW.id 
        AND situacao = 1; -- Only forecasted ones
    END IF;

    -- 2. Check if Schedule is Active
    IF COALESCE(NEW.situacao, 1) = 2 THEN
        RETURN NEW;
    END IF;

    -- 3. Determine Base Date
    v_base_date := NEW.proxima_vencimento;
    IF v_base_date IS NULL AND NEW.ano_mes_inicial IS NOT NULL THEN
        v_base_date := NEW.ano_mes_inicial;
    END IF;
    IF v_base_date IS NULL THEN
        v_base_date := CURRENT_DATE;
    END IF;

    -- 4. Check for Shared Cost Centers Split
    SELECT COUNT(*) INTO v_cc_count FROM public.schedule_cost_centers WHERE schedule_id = NEW.id;

    -- 5. Determine periodicity
    IF NEW.periodo = 'semanal' THEN v_periodo := '1 week';
    ELSIF NEW.periodo = 'quinzenal' THEN v_periodo := '15 days';
    ELSIF NEW.periodo = 'bimestral' THEN v_periodo := '2 months';
    ELSIF NEW.periodo = 'trimestral' THEN v_periodo := '3 months';
    ELSIF NEW.periodo = 'semestral' THEN v_periodo := '6 months';
    ELSIF NEW.periodo = 'anual' THEN v_periodo := '1 year';
    ELSE v_periodo := '1 month'; END IF;

    -- 6. Generate Forecast Items (usually for the next 12 iterations for fixed, or N parcels)
    IF v_cc_count > 0 THEN
        -- SPLIT LOGIC: For each cost center in the split
        FOR v_cc IN SELECT cost_center_id FROM public.schedule_cost_centers WHERE schedule_id = NEW.id LOOP
            
            IF NEW.tipo = 'fixo' THEN
                -- Generate 12 months ahead (or 12 iterations)
                FOR i IN 0..11 LOOP
                    INSERT INTO financials (
                        id_agendamento, user_id, organization_id, operacao, historico, especie, caixa_id, favorecido_id, 
                        ano_mes_inicial, valor, data_vencimento, situacao,
                        compromisso_id, grupo_compromisso_id, cost_center_id
                    ) VALUES (
                        NEW.id, NEW.user_id, NEW.organization_id, NEW.operacao, NEW.historico, NEW.especie, NEW.caixa_id, NEW.favorecido_id, 
                        NEW.ano_mes_inicial, 
                        NEW.valor / v_cc_count, -- Divided value
                        (v_base_date + (i * v_periodo))::DATE, 
                        1,
                        NEW.compromisso_id, NEW.grupo_compromisso_id, v_cc.cost_center_id
                    );
                END LOOP;
            ELSIF NEW.tipo = 'variavel' THEN
                v_parcelas := COALESCE(NEW.parcelas, 1);
                v_split_valor := (NEW.valor / v_parcelas) / v_cc_count;
                
                FOR i IN 0..(v_parcelas - 1) LOOP
                    IF v_parcelas > 1 THEN v_desc := NEW.historico || ' (' || (i + 1) || '/' || v_parcelas || ')';
                    ELSE v_desc := NEW.historico; END IF;

                    INSERT INTO financials (
                        id_agendamento, user_id, organization_id, operacao, historico, especie, caixa_id, favorecido_id, 
                        ano_mes_inicial, valor, data_vencimento, situacao,
                        compromisso_id, grupo_compromisso_id, cost_center_id
                    ) VALUES (
                        NEW.id, NEW.user_id, NEW.organization_id, NEW.operacao, v_desc, NEW.especie, NEW.caixa_id, NEW.favorecido_id, 
                        NEW.ano_mes_inicial, 
                        v_split_valor, -- Divided per parcel and per cost center
                        (v_base_date + (i * v_periodo))::DATE, 
                        1,
                        NEW.compromisso_id, NEW.grupo_compromisso_id, v_cc.cost_center_id
                    );
                END LOOP;
            END IF;
        END LOOP;
    ELSE
        -- STANDARD LOGIC: single cost center
        IF NEW.tipo = 'fixo' THEN
            FOR i IN 0..11 LOOP
                INSERT INTO financials (
                    id_agendamento, user_id, organization_id, operacao, historico, especie, caixa_id, favorecido_id, 
                    ano_mes_inicial, valor, data_vencimento, situacao,
                    compromisso_id, grupo_compromisso_id, cost_center_id
                ) VALUES (
                    NEW.id, NEW.user_id, NEW.organization_id, NEW.operacao, NEW.historico, NEW.especie, NEW.caixa_id, NEW.favorecido_id, 
                    NEW.ano_mes_inicial, NEW.valor, 
                    (v_base_date + (i * v_periodo))::DATE, 
                    1,
                    NEW.compromisso_id, NEW.grupo_compromisso_id, NEW.cost_center_id
                );
            END LOOP;
        ELSIF NEW.tipo = 'variavel' THEN
            v_parcelas := COALESCE(NEW.parcelas, 1);
            FOR i IN 0..(v_parcelas - 1) LOOP
                IF v_parcelas > 1 THEN v_desc := NEW.historico || ' (' || (i + 1) || '/' || v_parcelas || ')';
                ELSE v_desc := NEW.historico; END IF;

                INSERT INTO financials (
                    id_agendamento, user_id, organization_id, operacao, historico, especie, caixa_id, favorecido_id, 
                    ano_mes_inicial, valor, data_vencimento, situacao,
                    compromisso_id, grupo_compromisso_id, cost_center_id
                ) VALUES (
                    NEW.id, NEW.user_id, NEW.organization_id, NEW.operacao, v_desc, NEW.especie, NEW.caixa_id, NEW.favorecido_id, 
                    NEW.ano_mes_inicial, 
                    CASE WHEN v_parcelas > 0 THEN NEW.valor / v_parcelas ELSE NEW.valor END, 
                    (v_base_date + (i * v_periodo))::DATE, 
                    1,
                    NEW.compromisso_id, NEW.grupo_compromisso_id, NEW.cost_center_id
                );
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
