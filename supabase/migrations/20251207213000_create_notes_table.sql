
-- Create Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  group_name TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT,
  
  -- Add simple validation
  CONSTRAINT notes_group_name_check CHECK (char_length(group_name) > 0),
  CONSTRAINT notes_description_check CHECK (char_length(description) > 0)
);

-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own notes" ON notes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
