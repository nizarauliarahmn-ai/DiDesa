import { useState, useEffect } from 'react';
import ProdukHukumDashboard from './produk-hukum/ProdukHukumDashboard';
import ProdukHukumPerdes from './produk-hukum/ProdukHukumPerdes';
import ProdukHukumSK from './produk-hukum/ProdukHukumSK';
import ProdukHukumBeritaAcara from './produk-hukum/ProdukHukumBeritaAcara';
import ProdukHukumCategory from './produk-hukum/ProdukHukumCategory';

type SubTab = 'dashboard' | 'perdes' | 'sk_kades' | 'perkades' | 'mou_pks' | 'skb' | 'berita_acara' | 'piagam';

const DOC_SUBTABS = ['perdes', 'sk_kades', 'berita_acara'];

export default function AdminProdukHukum() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('dashboard');
  const [pendingDoc, setPendingDoc] = useState<{ kind: string; docId: string } | null>(null);

  // Deep-link dari pencarian global: baca sessionStorage (tahan mount ulang)
  // + dengar event (saat tab sudah terbuka).
  useEffect(() => {
    const consume = () => {
      try {
        const raw = sessionStorage.getItem('open_produk_hukum');
        if (!raw) return;
        sessionStorage.removeItem('open_produk_hukum');
        const p = JSON.parse(raw);
        if (p && p.kind && p.docId && DOC_SUBTABS.includes(p.kind)) {
          setActiveSubTab(p.kind as SubTab);
          setPendingDoc({ kind: p.kind, docId: String(p.docId) });
        }
      } catch { /* abaikan */ }
    };
    consume();
    const handler = () => consume();
    window.addEventListener('open_produk_hukum', handler);
    return () => window.removeEventListener('open_produk_hukum', handler);
  }, []);

  const consumeOpenDocId = () => setPendingDoc(null);

  const renderContent = () => {
    switch (activeSubTab) {
      case 'dashboard':
        return <ProdukHukumDashboard onNavigate={setActiveSubTab} />;
      case 'perdes':
        return <ProdukHukumPerdes onBack={() => setActiveSubTab('dashboard')} openDocId={pendingDoc?.kind === 'perdes' ? pendingDoc.docId : null} onConsumeOpenDocId={consumeOpenDocId} />;
      case 'sk_kades':
        return <ProdukHukumSK onBack={() => setActiveSubTab('dashboard')} openDocId={pendingDoc?.kind === 'sk_kades' ? pendingDoc.docId : null} onConsumeOpenDocId={consumeOpenDocId} />;
      case 'perkades':
        return <ProdukHukumCategory kategori="perkades" onBack={() => setActiveSubTab('dashboard')} />;
      case 'mou_pks':
        return <ProdukHukumCategory kategori="mou_pks" onBack={() => setActiveSubTab('dashboard')} />;
      case 'skb':
        return <ProdukHukumCategory kategori="skb" onBack={() => setActiveSubTab('dashboard')} />;
      case 'berita_acara':
        return <ProdukHukumBeritaAcara onBack={() => setActiveSubTab('dashboard')} openDocId={pendingDoc?.kind === 'berita_acara' ? pendingDoc.docId : null} onConsumeOpenDocId={consumeOpenDocId} />;
      case 'piagam':
        return <ProdukHukumCategory kategori="piagam" onBack={() => setActiveSubTab('dashboard')} />;
      default:
        return <ProdukHukumDashboard onNavigate={setActiveSubTab} />;
    }
  };

  return (
    <div className="pb-24">
      {renderContent()}
    </div>
  );
}
