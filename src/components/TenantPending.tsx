import { Clock, ShieldAlert, Globe, Mail } from 'lucide-react';

export default function TenantPending({ status }: { status: 'pending_approval' | 'inactive' }) {
  const isPending = status === 'pending_approval';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#047857_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8 text-center relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isPending ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-500' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500'}`}>
          {isPending ? <Clock size={40} strokeWidth={1.5} /> : <ShieldAlert size={40} strokeWidth={1.5} />}
        </div>

        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
          {isPending ? 'Menunggu Persetujuan' : 'Akun Desa Dinonaktifkan'}
        </h1>

        {isPending ? (
          <>
            <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
              Pendaftaran desa Anda telah diterima dan sedang diverifikasi oleh <strong>Tim DiDesa</strong>. Anda belum dapat masuk ke portal sebelum akun disetujui.
            </p>
            <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 mb-6 text-left">
              <p className="text-xs text-emerald-800 dark:text-emerald-400 font-semibold flex items-start gap-2">
                <Clock size={14} className="mt-0.5 flex-shrink-0" />
                <span>Tim kami akan menghubungi Anda via WhatsApp setelah akun disetujui. Proses biasanya memakan waktu 1x24 jam kerja.</span>
              </p>
            </div>
          </>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            Portal desa ini sedang dinonaktifkan oleh Pengelola Platform. Silakan hubungi <strong>Tim DiDesa</strong> untuk informasi lebih lanjut.
          </p>
        )}

        <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <Mail size={14} className="text-emerald-600" />
          <span className="font-mono">admin@sistemdidesa.id</span>
        </div>

        <a
          href="https://sistemdidesa.id"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/30"
        >
          <Globe size={16} />
          Kembali ke sistemdidesa.id
        </a>
      </div>
    </div>
  );
}