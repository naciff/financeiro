-- Fix missing organization_id in fn_sync_schedules_to_financials
-- This function is used by the tr_schedules_sync trigger

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
                id_agendamento, user_id, organization_id, operacao, historico, especie, caixa_id, favorecido_id, ano_mes_inicial, valor, data_vencimento, situacao
            ) VALUES (
                NEW.id, NEW.user_id, NEW.organization_id, NEW.operacao, NEW.historico, NEW.especie, NEW.caixa_id, NEW.favorecido_id, NEW.ano_mes_inicial, NEW.valor, 
                (v_base_date + (i * v_periodo))::DATE, 
                1
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
                id_agendamento, user_id, organization_id, operacao, historico, especie, caixa_id, favorecido_id, ano_mes_inicial, valor, data_vencimento, situacao
            ) VALUES (
                NEW.id, NEW.user_id, NEW.organization_id, NEW.operacao, v_desc, NEW.especie, NEW.caixa_id, NEW.favorecido_id, NEW.ano_mes_inicial, 
                CASE WHEN v_parcelas > 0 THEN NEW.valor / v_parcelas ELSE NEW.valor END, 
                (v_base_date + (i * v_periodo))::DATE, 
                1
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Notify user that this is the correct fix
-- select pg_notify('pgrst', 'reload schema');
