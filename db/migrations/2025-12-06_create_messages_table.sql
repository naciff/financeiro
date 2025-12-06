CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policy for read access (public)
CREATE POLICY "Allow public read access" ON messages
  FOR SELECT USING (true);

-- Seed initial data
INSERT INTO messages (content) VALUES
  ('Se quer ter sucesso completo em sua vida, você tem que ser foda.'),
  ('O único lugar onde o sucesso vem antes do trabalho é no dicionário.'),
  ('Não espere por uma oportunidade, crie-a.'),
  ('O sucesso é a soma de pequenos esforços repetidos dia após dia.'),
  ('Acredite que você pode, assim você já está no meio do caminho.');
