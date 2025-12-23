-- Migration to fix shared cost center reporting and sync issues
-- 1. Create a trigger function to re-sync schedules when their split changes
CREATE OR REPLACE FUNCTION public.fn_sync_schedule_cost_center_changes()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- We use a dummy update to re-trigger public.fn_sync_schedules_to_financials
    -- Since 'updated_at' and 'ativo' were not found, we use 'tipo = tipo' which is confirmed in schema
    UPDATE public.schedules 
    SET tipo = tipo
    WHERE id = COALESCE(NEW.schedule_id, OLD.schedule_id);
    
    RETURN NULL; -- result is ignored for AFTER triggers
END;
$$ LANGUAGE plpgsql;

-- 2. Add the trigger to schedule_cost_centers
DROP TRIGGER IF EXISTS tr_sync_schedule_on_cc_change ON public.schedule_cost_centers;
CREATE TRIGGER tr_sync_schedule_on_cc_change
AFTER INSERT OR UPDATE OR DELETE ON public.schedule_cost_centers
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_schedule_cost_center_changes();

-- 3. Update existing records to fix any currently incorrect splits in visuals/reports
-- This will run the sync logic for every schedule that has split entries
UPDATE public.schedules
SET tipo = tipo
WHERE id IN (SELECT DISTINCT schedule_id FROM public.schedule_cost_centers);
