-- Add compartilhado column to cost_centers table
ALTER TABLE public.cost_centers 
ADD COLUMN IF NOT EXISTS compartilhado BOOLEAN DEFAULT false;
