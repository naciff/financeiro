-- Migration to support shared cost centers and automatic value splitting
-- 1. Ensure 'compartilhado' exists on cost_centers
ALTER TABLE public.cost_centers ADD COLUMN IF NOT EXISTS compartilhado boolean DEFAULT false;

-- 2. Create table for shared cost centers per schedule
CREATE TABLE IF NOT EXISTS public.schedule_cost_centers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    cost_center_id uuid NOT NULL REFERENCES public.cost_centers(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for performance and uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_schedule_cost_center ON public.schedule_cost_centers(schedule_id, cost_center_id);

-- 3. RLS Policies
ALTER TABLE public.schedule_cost_centers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage shared costs of their orgs" ON public.schedule_cost_centers;
    CREATE POLICY "Users can manage shared costs of their orgs"
    ON public.schedule_cost_centers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.organization_members
            WHERE organization_id = schedule_cost_centers.organization_id
            AND user_id = auth.uid()
        )
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. Update the trigger function to handle splitting
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
        BEGIN
            v_base_date := TO_DATE(NEW.ano_mes_inicial || '-01', 'YYYY-MM-DD');
        EXCEPTION WHEN OTHERS THEN
            v_base_date := NULL;
        END;
    END IF;
    IF v_base_date IS NULL THEN
        v_base_date := CURRENT_DATE;
    END IF;

    -- 4. Check for Shared Cost Centers Split
    SELECT COUNT(*) INTO v_cc_count FROM public.schedule_cost_centers WHERE schedule_id = NEW.id;

    -- 5. Determine periodicity
    IF NEW.periodo = 'anual' THEN v_periodo := '1 year';
    ELSIF NEW.periodo = 'semestral' THEN v_periodo := '6 months';
    ELSE v_periodo := '1 month'; END IF;

    -- 6. Generate Forecast Items
    IF v_cc_count > 0 THEN
        -- SPLIT LOGIC: For each cost center in the split
        FOR v_cc IN SELECT cost_center_id FROM public.schedule_cost_centers WHERE schedule_id = NEW.id LOOP
            
            IF NEW.tipo = 'fixo' THEN
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
