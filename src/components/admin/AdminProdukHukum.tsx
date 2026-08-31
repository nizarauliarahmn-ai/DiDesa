import { useState } from 'react';
import ProdukHukumDashboard from './produk-hukum/ProdukHukumDashboard';
import ProdukHukumPerdes from './produk-hukum/ProdukHukumPerdes';
import ProdukHukumCategory from './produk-hukum/ProdukHukumCategory';

type SubTab = 'dashboard' | 'perdes' | 'sk_kades' | 'perkades' | 'mou_pks' | 'skb' | 'berita_acara' | 'piagam';

export default function AdminProdukHukum() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('dashboard');

  const renderContent = () => {
    switch (activeSubTab) {
      case 'dashboard':
        return <ProdukHukumDashboard onNavigate={setActiveSubTab} />;
      case 'perdes':
        return <ProdukHukumPerdes onBack={() => setActiveSubTab('dashboard')} />;
      case 'sk_kades':
        return <ProdukHukumCategory kategori="sk_kades" onBack={() => setActiveSubTab('dashboard')} />;
      case 'perkades':
        return <ProdukHukumCategory kategori="perkades" onBack={() => setActiveSubTab('dashboard')} />;
      case 'mou_pks':
        return <ProdukHukumCategory kategori="mou_pks" onBack={() => setActiveSubTab('dashboard')} />;
      case 'skb':
        return <ProdukHukumCategory kategori="skb" onBack={() => setActiveSubTab('dashboard')} />;
      case 'berita_acara':
        return <ProdukHukumCategory kategori="berita_acara" onBack={() => setActiveSubTab('dashboard')} />;
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
