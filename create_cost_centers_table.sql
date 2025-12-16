/* 
  Create cost_centers table
*/

CREATE TABLE IF NOT EXISTS public.cost_centers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  descricao text NOT NULL,
  principal boolean DEFAULT false,
  situacao boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT cost_centers_pkey PRIMARY KEY (id),
  CONSTRAINT cost_centers_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- RLS Policies
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cost centers" ON public.cost_centers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cost centers" ON public.cost_centers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cost centers" ON public.cost_centers
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cost centers" ON public.cost_centers
  FOR DELETE USING (auth.uid() = user_id);
