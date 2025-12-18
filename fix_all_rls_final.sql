-- FIX ALL RLS POLICIES (Comprehensive v2)
-- Handles transaction_attachments correctly (no user_id).

DO $$ 
DECLARE 
    t text;
    -- Tables WITH user_id and organization_id
    tables_to_fix text[] := ARRAY[
        'clients', 
        'accounts', 
        'schedules', 
        'transactions', 
        'financials',   
        'commitment_groups', 
        'commitments', 
        'cashboxes', 
        'notes', 
        'client_defaults', 
        'cost_centers',
        'notifications'
    ];
BEGIN
    -- 1. FIX STANDARD TABLES (user_id + organization_id)
    FOR t IN SELECT unnest(tables_to_fix) LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            -- Drop potential bad policies
            EXECUTE format('DROP POLICY IF EXISTS "p_%I_owner" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Shared %I access" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "%I_policy" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Owners can manage %I" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Users can view %I" ON public.%I', t, t);

            -- Create correct policy
            EXECUTE format('CREATE POLICY "Shared %I access" ON public.%I FOR ALL USING ( public.has_access(user_id, organization_id) ) WITH CHECK ( public.has_access(user_id, organization_id) )', t, t);
            
            RAISE NOTICE 'Fixed policies for table: %', t;
        END IF;
    END LOOP;

    -- 2. FIX TRANSACTION_ATTACHMENTS (no user_id column, uses organization_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transaction_attachments' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Users can view attachments linked to their transactions" ON public.transaction_attachments;
        DROP POLICY IF EXISTS "Users can insert attachments linked to their transactions" ON public.transaction_attachments;
        DROP POLICY IF EXISTS "Users can delete their own attachments" ON public.transaction_attachments;
        DROP POLICY IF EXISTS "Shared transaction_attachments access" ON public.transaction_attachments;

        -- Ensure organization_id exists (it should from migration)
        -- If it exists, use has_access(NULL, organization_id) because has_access handles NULL user_id by ignoring it if org_id matches
        -- or we pass NULL for user_id argument.
        -- public.has_access(row_user_id uuid, row_org_id uuid DEFAULT NULL)
        
        -- Policy: Allow if has access to organization
        CREATE POLICY "Shared transaction_attachments access" ON public.transaction_attachments 
        FOR ALL 
        USING ( public.has_access(NULL, organization_id) ) 
        WITH CHECK ( public.has_access(NULL, organization_id) );
        
        RAISE NOTICE 'Fixed policies for table: transaction_attachments';
    END IF;

END $$;
