-- Trigger function to populate financials from schedules
-- UPDATED: Uses NEW.data_vencimento to respect the specific day

-- 1. Create Function
CREATE OR REPLACE FUNCTION fn_schedules_insert_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_parcelas INTEGER;
    v_periodo INTERVAL;
    v_base_date DATE;
    v_desc TEXT;
BEGIN
    -- Determine Base Date: Use data_vencimento if available to respect the day (e.g., 20)
    -- Fallback to ano_mes_inicial (1st of month) only if null
    IF NEW.data_vencimento IS NOT NULL THEN
        v_base_date := NEW.data_vencimento;
    ELSE
        v_base_date := TO_DATE(NEW.ano_mes_inicial || '-01', 'YYYY-MM-DD');
    END IF;

    IF NEW.tipo = 'fixo' THEN
        -- FIXED: Generate 12 months forecast
        
        -- Determine Interval
        IF NEW.periodo = 'anual' THEN
            v_periodo := '1 year';
        ELSIF NEW.periodo = 'semestral' THEN
            v_periodo := '6 months';
        ELSE
            v_periodo := '1 month';
        END IF;

        FOR i IN 0..11 LOOP
            INSERT INTO financials (
                id_agendamento,
                user_id,
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
                NEW.id,
                NEW.user_id,
                NEW.operacao,
                NEW.historico,
                NEW.especie,
                NEW.caixa_id,
                NEW.favorecido_id,
                NEW.ano_mes_inicial,
                NEW.valor,
                (v_base_date + (i * v_periodo))::DATE,
                1 -- 1 = Agendado
            );
        END LOOP;
    
    ELSIF NEW.tipo = 'variavel' THEN
        -- VARIABLE: Generate N installments
        v_parcelas := COALESCE(NEW.parcelas, 1);
        
        -- Determine Interval
        IF NEW.periodo = 'anual' THEN
            v_periodo := '1 year';
        ELSIF NEW.periodo = 'semestral' THEN
            v_periodo := '6 months';
        ELSE
            v_periodo := '1 month';
        END IF;

        FOR i IN 0..(v_parcelas - 1) LOOP
            -- Format description
            IF v_parcelas > 1 THEN
                v_desc := NEW.historico || ' (' || (i + 1) || '/' || v_parcelas || ')';
            ELSE
                v_desc := NEW.historico;
            END IF;

            INSERT INTO financials (
                id_agendamento,
                user_id,
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
                NEW.id,
                NEW.user_id,
                NEW.operacao,
                v_desc,
                NEW.especie,
                NEW.caixa_id,
                NEW.favorecido_id,
                NEW.ano_mes_inicial,
                CASE WHEN v_parcelas > 0 THEN NEW.valor / v_parcelas ELSE NEW.valor END,
                (v_base_date + (i * v_periodo))::DATE,
                1 -- 1 = Agendado
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop and Recreate Trigger
DROP TRIGGER IF EXISTS tr_schedules_insert ON schedules;

CREATE TRIGGER tr_schedules_insert
AFTER INSERT ON schedules
FOR EACH ROW
EXECUTE FUNCTION fn_schedules_insert_trigger();
