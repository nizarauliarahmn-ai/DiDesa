import React, { useEffect, useState } from 'react';
import LegalDocumentLayout from '../components/common/LegalDocumentLayout';
import { loadAppSettings } from '../utils/appSettings';

export default function KebijakanPrivasiPage() {
  const [content, setContent] = useState(() => loadAppSettings().privacyContent || '');

  useEffect(() => {
    const handleUpdate = () => setContent(loadAppSettings().privacyContent || '');
    window.addEventListener('global_branding_updated', handleUpdate);
    return () => window.removeEventListener('global_branding_updated', handleUpdate);
  }, []);

  return (
    <LegalDocumentLayout
      title="Kebijakan Privasi"
      updatedAt={new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
      content={content}
    />
  );
}