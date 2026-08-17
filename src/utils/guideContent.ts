import {
  Tablet, FileText, Gift, Building2, HelpCircle, Sparkles, BookOpen, Users,
  ShieldCheck, Settings, Camera, Megaphone, TrendingUp, ClipboardList, type LucideIcon
} from 'lucide-react';

export interface GuideContentItem {
  id: string;
  category: string;
  category_label: string;
  title: string;
  content: string;
  icon: string;
  sort_order: number;
  is_active: number;
}

export const DEFAULT_CATEGORIES = [
  { key: 'kiosk', label: 'Operasional Kios & Buku Tamu' },
  { key: 'surat', label: 'Pengurusan Surat Administrasi' },
  { key: 'bansos', label: 'Bantuan Sosial & Penduduk' },
  { key: 'pengaturan', label: 'Pengaturan KOP & Profil Desa' },
  { key: 'ai', label: 'Pengaturan Asisten AI (Desi)' },
  { key: 'faq', label: 'FAQ & Solusi Kendala' },
];

export const GUIDE_ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: 'Tablet', Icon: Tablet },
  { name: 'FileText', Icon: FileText },
  { name: 'Gift', Icon: Gift },
  { name: 'Building2', Icon: Building2 },
  { name: 'HelpCircle', Icon: HelpCircle },
  { name: 'Sparkles', Icon: Sparkles },
  { name: 'BookOpen', Icon: BookOpen },
  { name: 'Users', Icon: Users },
  { name: 'ShieldCheck', Icon: ShieldCheck },
  { name: 'Settings', Icon: Settings },
  { name: 'Camera', Icon: Camera },
  { name: 'Megaphone', Icon: Megaphone },
  { name: 'TrendingUp', Icon: TrendingUp },
  { name: 'ClipboardList', Icon: ClipboardList },
];

const ICON_MAP: Record<string, LucideIcon> = {
  Tablet, FileText, Gift, Building2, HelpCircle, Sparkles, BookOpen, Users,
  ShieldCheck, Settings, Camera, Megaphone, TrendingUp, ClipboardList,
};

export function getGuideIcon(name?: string): LucideIcon {
  return ICON_MAP[name || ''] || FileText;
}

export function getCategoryLabel(category: string): string {
  const found = DEFAULT_CATEGORIES.find(c => c.key === category);
  return found ? found.label : category;
}