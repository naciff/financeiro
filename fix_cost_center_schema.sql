-- 1. Ensure column exists (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schedules' AND column_name = 'cost_center_id') THEN
        ALTER TABLE public.schedules ADD COLUMN cost_center_id uuid REFERENCES public.cost_centers(id);
    END IF;
END $$;

-- 2. Ensure Constraint Exists (If added manually without constraint)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'schedules_cost_center_id_fkey') THEN
        ALTER TABLE public.schedules ADD CONSTRAINT schedules_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);
    END IF;
END $$;

-- 3. Get or Create Default Cost Center
DO $$
DECLARE
    v_cost_center_id uuid;
    v_user_id uuid;
BEGIN
    -- Loop through users who have schedules but no cost center assigned (or just do it for all)
    -- Ideally we want to do this per user/organization context.
    -- For simplicity, let's pick the 'principal' cost center for each user found in cost_centers.
    
    -- Update schedules that have NULL cost_center_id
    UPDATE public.schedules s
    SET cost_center_id = (
        SELECT id FROM public.cost_centers cc 
        WHERE cc.user_id = s.user_id AND cc.principal = true 
        LIMIT 1
    )
    WHERE s.cost_center_id IS NULL;

    -- If there are still NULLs (because no principal exists), pick ANY cost center for that user
    UPDATE public.schedules s
    SET cost_center_id = (
        SELECT id FROM public.cost_centers cc 
        WHERE cc.user_id = s.user_id 
        ORDER BY created_at ASC 
        LIMIT 1
    )
    WHERE s.cost_center_id IS NULL;
    
    -- If still NULL, creating a default one is tricky without user_id context iterating.
    -- We'll assume the user has at least one cost center if they are using the feature.
END $$;
