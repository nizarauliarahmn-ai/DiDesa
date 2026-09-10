-- =====================================================
-- Tabel: apbdesa_pencairan
-- Tracking setiap kali pencairan dana untuk kegiatan APBDesa
-- =====================================================

CREATE TABLE IF NOT EXISTS apbdesa_pencairan (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  apbdesa_id UUID NOT NULL REFERENCES apbdesa(id) ON DELETE CASCADE,
  jumlah NUMERIC NOT NULL DEFAULT 0,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  keterangan TEXT,
  foto_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_apbdesa_pencairan_tenant ON apbdesa_pencairan(tenant_id);
CREATE INDEX IF NOT EXISTS idx_apbdesa_pencairan_apbdesa ON apbdesa_pencairan(apbdesa_id);

-- RLS: hanya bisa akses data sendiri
ALTER TABLE apbdesa_pencairan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apbdesa_pencairan_tenant_isolation"
  ON apbdesa_pencairan
  FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Bucket untuk foto pencairan APBDesa
INSERT INTO storage.buckets (id, name, public) VALUES ('apbdesa-foto', 'apbdesa-foto', true)
ON CONFLICT (id) DO NOTHING;
