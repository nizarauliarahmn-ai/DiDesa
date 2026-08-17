-- Flexibel: Konten halaman Panduan & Tutorial dikelola penuh oleh SaaS Admin
-- 1. category        : kunci kategori, misal kiosk, surat, bansos, pengaturan, ai, faq, atau kategori kustom
-- 2. category_label  : label tab yang tampil, misal "Operasional Kios & Buku Tamu"
-- 3. title           : judul artikel / pertanyaan (untuk FAQ)
-- 4. content         : isi artikel dalam Markdown
-- 5. icon            : nama ikon lucide (Tablet, FileText, Gift, Building2, HelpCircle, Sparkles, ...)
-- 6. sort_order      : urutan tampil dalam kategori (kecil = atas)
-- 7. is_active       : 1 = tampil, 0 = draft/sembunyi

CREATE TABLE IF NOT EXISTS public.guide_content (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  category_label TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  icon TEXT DEFAULT 'FileText',
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guide_content_category ON public.guide_content (category, is_active, sort_order);