-- Enable RLS if not already enabled
ALTER TABLE apbdesa_pencairan ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (same pattern as other tables)
CREATE POLICY "Allow all for authenticated users" ON apbdesa_pencairan
  FOR ALL
  USING (true)
  WITH CHECK (true);
