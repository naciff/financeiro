-- POPULATE FINANCIALS (Formerly Livro Financeiro)
-- Clears existing data and repopulates from Schedules
-- UPDATED: Uses robust date logic (proxima_vencimento -> ano_mes_inicial -> today)
-- UPDATED: Skips CONCLUDED schedules (situacao = 2)

DO $$
DECLARE
    r_sched RECORD;
    v_parcelas INTEGER;
    v_periodo INTERVAL;
    v_base_date DATE;
    v_desc TEXT;
    v_meses_to_generate INTEGER := 12; -- Forecast Window
BEGIN
    -- 1. Clear table to start fresh
    DELETE FROM financials;

    -- 2. Iterate through ALL Schedules
    FOR r_sched IN SELECT * FROM schedules LOOP
        
        -- SKIP if Schedule is Concluded (2)
        -- Assuming 1=Active, 2=Concluded, NULL=Active
        IF COALESCE(r_sched.situacao, 1) = 2 THEN
            CONTINUE;
        END IF;

        -- 3. Determine Base Date (Robust Logic)
        -- A. Try proxima_vencimento (User selected specific date)
        -- Note: Ensure column exists in your schema. If not, this line might fail if you haven't migrated.
        v_base_date := r_sched.proxima_vencimento;

        -- B. If NULL, try ano_mes_inicial (YYYY-MM) + '-01'
        IF v_base_date IS NULL AND r_sched.ano_mes_inicial IS NOT NULL THEN
            BEGIN
                v_base_date := TO_DATE(r_sched.ano_mes_inicial || '-01', 'YYYY-MM-DD');
            EXCEPTION WHEN OTHERS THEN
                v_base_date := NULL; -- Handle conversion errors
            END;
        END IF;

        -- C. Ultimate Fallback: Current Date
        IF v_base_date IS NULL THEN
            v_base_date := CURRENT_DATE;
        END IF;


        -- 4. Generate Items
        IF r_sched.tipo = 'fixo' THEN
            -- FIXED: Generate 12 months forecast
            
            -- Determine Interval
            IF r_sched.periodo = 'anual' THEN
                v_periodo := '1 year';
            ELSIF r_sched.periodo = 'semestral' THEN
                v_periodo := '6 months';
            ELSE
                v_periodo := '1 month';
            END IF;

            FOR i IN 0..(v_meses_to_generate - 1) LOOP
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
                    r_sched.id,
                    r_sched.user_id,
                    r_sched.operacao,
                    r_sched.historico,
                    r_sched.especie,
                    r_sched.caixa_id,
                    r_sched.favorecido_id,
                    r_sched.ano_mes_inicial,
                    r_sched.valor,
                    (v_base_date + (i * v_periodo))::DATE,
                    1 -- 1 = Agendado
                );
            END LOOP;

        ELSIF r_sched.tipo = 'variavel' THEN
            -- VARIABLE: Generate N installments
            v_parcelas := COALESCE(r_sched.parcelas, 1);
            
            -- Determine Interval
            IF r_sched.periodo = 'anual' THEN
                v_periodo := '1 year';
            ELSIF r_sched.periodo = 'semestral' THEN
                v_periodo := '6 months';
            ELSE
                v_periodo := '1 month';
            END IF;

            FOR i IN 0..(v_parcelas - 1) LOOP
                -- Format description
                IF v_parcelas > 1 THEN
                    v_desc := r_sched.historico || ' (' || (i + 1) || '/' || v_parcelas || ')';
                ELSE
                    v_desc := r_sched.historico;
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
                    r_sched.id,
                    r_sched.user_id,
                    r_sched.operacao,
                    v_desc,
                    r_sched.especie,
                    r_sched.caixa_id,
                    r_sched.favorecido_id,
                    r_sched.ano_mes_inicial,
                    CASE WHEN v_parcelas > 0 THEN r_sched.valor / v_parcelas ELSE r_sched.valor END,
                    (v_base_date + (i * v_periodo))::DATE,
                    1 -- 1 = Agendado
                );
            END LOOP;
        END IF;

    END LOOP;
END;
$$ LANGUAGE plpgsql;
