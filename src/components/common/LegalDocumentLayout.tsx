import React from 'react';

type Props = {
  title: string;
  updatedAt?: string;
  content: string;
};

export default function LegalDocumentLayout({ title, updatedAt, content }: Props) {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{title}</h1>
          {updatedAt && <p className="text-sm text-gray-500 mb-6">Terakhir diperbarui: {updatedAt}</p>}
          {content ? (
            <div
              className="prose prose-emerald max-w-none"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <p className="text-gray-500">Dokumen belum tersedia. Silakan hubungi pengelola aplikasi.</p>
          )}
        </div>
      </div>
    </div>
  );
}