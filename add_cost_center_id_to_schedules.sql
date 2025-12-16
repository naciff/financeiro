ALTER TABLE public.schedules
ADD COLUMN cost_center_id uuid REFERENCES public.cost_centers(id);
