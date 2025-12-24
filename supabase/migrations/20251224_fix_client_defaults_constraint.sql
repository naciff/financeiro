-- Migration: Fix client_defaults constraint for upsert
-- This allows upserting based on organization_id and client_id

ALTER TABLE public.client_defaults 
DROP CONSTRAINT IF EXISTS client_defaults_user_id_client_id_key;

-- Ensure there are no duplicate (organization_id, client_id) before adding the constraint
-- If there are duplicates, we'll keep the most recent one
DELETE FROM public.client_defaults a
USING public.client_defaults b
WHERE a.id < b.id 
  AND a.organization_id = b.organization_id 
  AND a.client_id = b.client_id;

ALTER TABLE public.client_defaults
DROP CONSTRAINT IF EXISTS client_defaults_org_client_unique;

ALTER TABLE public.client_defaults
ADD CONSTRAINT client_defaults_org_client_unique UNIQUE (organization_id, client_id);
