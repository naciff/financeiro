-- Migration to add missing relational IDs to financials and update trigger
-- This fixes the issue where 'Grupo Compromisso', 'Compromisso' and 'Centro de Custo' come up null in the Cash Book

DO $$
BEGIN
    -- 1. Add columns to 'financials' if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financials' AND column_name = 'compromisso_id') THEN
        ALTER TABLE public.financials ADD COLUMN compromisso_id uuid REFERENCES public.commitments(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financials' AND column_name = 'grupo_compromisso_id') THEN
        ALTER TABLE public.financials ADD COLUMN grupo_compromisso_id uuid REFERENCES public.commitment_groups(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financials' AND column_name = 'cost_center_id') THEN
        ALTER TABLE public.financials ADD COLUMN cost_center_id uuid REFERENCES public.cost_centers(id);
    END IF;
END $$;

-- 2. Update existing records from their parent schedules
UPDATE public.financials f
SET 
    compromisso_id = s.compromisso_id,
    grupo_compromisso_id = s.grupo_compromisso_id,
    cost_center_id = s.cost_center_id
FROM public.schedules s
WHERE f.id_agendamento = s.id
AND (f.compromisso_id IS NULL OR f.grupo_compromisso_id IS NULL OR f.cost_center_id IS NULL);

-- 3. Update the trigger function to propagate these IDs automatically for NEW items
CREATE OR REPLACE FUNCTION fn_sync_schedules_to_financials()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_parcelas INTEGER;
    v_periodo INTERVAL;
    v_base_date DATE;
    v_desc TEXT;
BEGIN
    -- 1. Handle UPDATE or INSERT:
    IF TG_OP = 'UPDATE' THEN
        DELETE FROM financials 
        WHERE id_agendamento = NEW.id 
        AND situacao = 1; 
    END IF;

    -- 2. Check if Schedule is Active
    IF COALESCE(NEW.situacao, 1) = 2 THEN
        RETURN NEW;
    END IF;

    -- 3. Determine Base Date
    v_base_date := NEW.proxima_vencimento;

    IF v_base_date IS NULL AND NEW.ano_mes_inicial IS NOT NULL THEN
        BEGIN
            v_base_date := TO_DATE(NEW.ano_mes_inicial || '-01', 'YYYY-MM-DD');
        EXCEPTION WHEN OTHERS THEN
            v_base_date := NULL;
        END;
    END IF;

    IF v_base_date IS NULL THEN
        v_base_date := CURRENT_DATE;
    END IF;

    -- 4. Generate New Forecast Items
    
    IF NEW.tipo = 'fixo' THEN
        IF NEW.periodo = 'anual' THEN v_periodo := '1 year';
        ELSIF NEW.periodo = 'semestral' THEN v_periodo := '6 months';
        ELSE v_periodo := '1 month'; END IF;

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
        
        IF NEW.periodo = 'anual' THEN v_periodo := '1 year';
        ELSIF NEW.periodo = 'semestral' THEN v_periodo := '6 months';
        ELSE v_periodo := '1 month'; END IF;

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

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
