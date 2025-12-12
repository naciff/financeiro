CREATE TABLE IF NOT EXISTS transaction_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_data TEXT, -- Base64 encoded content
  document_type TEXT DEFAULT 'receipt',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view attachments linked to their transactions" ON transaction_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_attachments.transaction_id
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert attachments linked to their transactions" ON transaction_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_attachments.transaction_id
      AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own attachments" ON transaction_attachments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = transaction_attachments.transaction_id
      AND t.user_id = auth.uid()
    )
  );
