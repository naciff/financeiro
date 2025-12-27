CREATE TABLE IF NOT EXISTS public.user_dashboard_preferences (
    user_id UUID NOT NULL REFERENCES auth.users(id),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    visible_widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
    visible_charts JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, organization_id)
);

-- RLS
ALTER TABLE public.user_dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- Allow users to insert if they own the user_id
CREATE POLICY "Users can insert their own dashboard prefs"
ON public.user_dashboard_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own dashboard prefs
CREATE POLICY "Users can update their own dashboard prefs"
ON public.user_dashboard_preferences
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to select their own dashboard prefs
CREATE POLICY "Users can select their own dashboard prefs"
ON public.user_dashboard_preferences
FOR SELECT
USING (auth.uid() = user_id);
