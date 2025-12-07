-- FUNCTION: Deactivate Schedule
-- Marks pending financials as Cancelled (3) and Schedule as Concluded (2)

CREATE OR REPLACE FUNCTION fn_deactivate_schedule(p_schedule_id UUID)
RETURNS JSON AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- 1. Mark PENDING (1) financial items as CANCELLED (3)
    -- We do NOT touch Paid/Confirmed (2) items to preserve history.
    UPDATE financials 
    SET situacao = 3
    WHERE id_agendamento = p_schedule_id 
    AND situacao = 1;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    -- 2. Mark Schedule as CONCLUDED (2)
    -- The trigger 'tr_schedules_sync' will run, but since we changed situacao to 3,
    -- it won't delete the pending items (because they are no longer 1).
    -- And since NEW.situacao = 2, it won't generate new items.
    UPDATE schedules
    SET situacao = 2
    WHERE id = p_schedule_id;

    RETURN json_build_object('success', true, 'updated_items', v_updated_count);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql;
