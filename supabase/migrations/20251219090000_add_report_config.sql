-- Add report_config column to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS report_config jsonb DEFAULT '{}'::jsonb;
