import { useEffect, useState } from 'react';
import LegalDocumentLayout from '../components/common/LegalDocumentLayout';
import { loadAppSettings } from '../utils/appSettings';

export default function SyaratKetentuanPage() {
  const [content, setContent] = useState(() => loadAppSettings().termsContent || '');

  useEffect(() => {
    const handleUpdate = () => setContent(loadAppSettings().termsContent || '');
    window.addEventListener('global_branding_updated', handleUpdate);
    return () => window.removeEventListener('global_branding_updated', handleUpdate);
  }, []);

  return (
    <LegalDocumentLayout
      title="Syarat & Ketentuan"
      updatedAt={new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
      content={content}
    />
  );
}