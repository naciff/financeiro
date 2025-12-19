ALTER TABLE public.schedules
ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id);

ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.cost_centers(id);
