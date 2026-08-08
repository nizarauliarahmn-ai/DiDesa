import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, Bug, X, Send, AlertTriangle, CheckCircle2, 
  HelpCircle, Sparkles, MessageSquare, Info, ShieldAlert, Monitor, Clock, ChevronLeft, Plus
} from 'lucide-react';
import { submitBugReportOnline, fetchVillageBugReportsOnline, replyToBugReportOnline, BugReport } from '../../utils/bugReportService';
import { showToast } from '../../utils/toast';

export const GlobalBugReportButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [viewMode, setViewMode] = useState<'list' | 'chat' | 'form'>('list');
  const [tickets, setTickets] = useState<BugReport[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<BugReport | null>(null);
  const [replyText, setReplyText] = useState('');

  // Auth User & Context
  const authUser = JSON.parse(localStorage.getItem('didesa_auth_user') || '{}');
  const storedTenant = localStorage.getItem('didesa_current_tenant');
  let villageName = 'Desa';
  if (storedTenant) {
    try {
      villageName = JSON.parse(storedTenant).nama_desa || villageName;
    } catch (e) {}
  }

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'bug' as 'bug' | 'feature_request' | 'question',
    module: 'Surat & Administrasi',
    urgency: 'Sedang' as 'Rendah' | 'Sedang' | 'Tinggi' | 'Mendesak'
  });

  const fetchTickets = async () => {
    const data = await fetchVillageBugReportsOnline();
    setTickets(data);
  };

  useEffect(() => {
    if (isOpen) {
      fetchTickets();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      if (isOpen) fetchTickets();
    };
    window.addEventListener('bug_reports_updated', handleUpdate);
    return () => window.removeEventListener('bug_reports_updated', handleUpdate);
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setViewMode('list');
  };

  const handleNewTicket = () => {
    setFormData({
      title: '',
      description: '',
      type: 'bug',
      module: 'Surat & Administrasi',
      urgency: 'Sedang'
    });
    setViewMode('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim()) {
      showToast('Harap isi Judul Kendala dan Deskripsi Detail!', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitBugReportOnline({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        module: formData.module,
        urgency: formData.urgency,
        reporter_name: authUser.name || 'Admin Desa',
        reporter_role: authUser.role === 'kades' ? 'Super Admin' : 'Admin Desa',
        reporter_email: authUser.email || '',
        page_url: window.location.href
      });

      if (result) {
        showToast('🚀 Laporan kendala berhasil terkirim online ke Tim SaaS!', 'success');
        await fetchTickets();
        setViewMode('list');
      } else {
        throw new Error('Gagal mengirim ke server cloud.');
      }
    } catch (err: any) {
      console.error('Error submitting bug report:', err);
      showToast('Gagal mengirim laporan: ' + err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setIsSubmitting(true);
    try {
      const success = await replyToBugReportOnline(selectedTicket.id, {
        sender: authUser.name || 'Admin',
        role: authUser.role === 'kades' ? 'Super Admin' : 'Admin Desa',
        text: replyText
      });

      if (success) {
        setReplyText('');
        const updated = await fetchVillageBugReportsOnline();
        setTickets(updated);
        const newSelected = updated.find(t => t.id === selectedTicket.id);
        if (newSelected) setSelectedTicket(newSelected);
      } else {
        throw new Error('Gagal membalas pesan.');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) - Positioned Fixed at Bottom Right */}
      <div className="fixed bottom-6 right-6 z-[90] flex items-center gap-2">
        <button
          onClick={handleOpen}
          className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-full font-bold shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 active:scale-95 cursor-pointer border border-emerald-400/30"
          title="Hubungi Pusat Bantuan / Laporkan Kendala"
        >
          <div className="w-3 h-3 rounded-full bg-rose-400 animate-ping absolute top-0 right-0" />
          <MessageSquare size={24} className="shrink-0" />
        </button>
      </div>

      {/* MODAL FORM LAPORAN BUG / KENDALA */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-[110] flex items-end justify-end p-0">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-[380px] sm:w-[420px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[75vh] min-h-[500px] overflow-hidden origin-bottom-right animate-in zoom-in-95 duration-200 shadow-emerald-900/20">
            
            {/* Header */}
            <div className="p-5 bg-gradient-to-br from-emerald-600 via-teal-700 to-emerald-900 text-white flex items-center justify-between relative overflow-hidden shrink-0">
              <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="relative z-10 flex items-center gap-3">
                {viewMode !== 'list' && (
                  <button onClick={() => setViewMode('list')} className="p-1 hover:bg-white/20 rounded-full cursor-pointer">
                    <ChevronLeft size={20} />
                  </button>
                )}
                <div className="w-10 h-10 rounded-2xl bg-white/20 text-white border border-white/30 flex items-center justify-center font-bold shadow-inner">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold tracking-tight">
                    {viewMode === 'form' ? 'Tiket Bantuan Baru' : viewMode === 'chat' ? selectedTicket?.title : 'Pusat Bantuan SaaS'}
                  </h3>
                  <p className="text-[10px] text-emerald-100">
                    Bantuan teknis untuk {villageName}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="relative z-10 p-2 text-slate-300 hover:text-white rounded-full hover:bg-white/10 transition-all cursor-pointer shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* List View */}
            {viewMode === 'list' && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-slate-50/50 dark:bg-slate-900/50">
                <button onClick={handleNewTicket} className="w-full p-4 rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/50 dark:bg-emerald-900/10 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer">
                  <Plus size={16} /> Buat Tiket Baru
                </button>

                {tickets.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 opacity-50">
                    <MessageSquare size={32} className="mb-2 text-slate-400" />
                    <p className="text-xs font-medium text-slate-500">Belum ada tiket bantuan aktif.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tickets.map(ticket => (
                      <div 
                        key={ticket.id} 
                        onClick={() => { setSelectedTicket(ticket); setViewMode('chat'); }}
                        className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer transition-all shadow-sm group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{ticket.title}</h4>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                            ticket.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700' :
                            ticket.status === 'Diproses' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {ticket.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mb-2">{ticket.description}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                          <span>{new Date(ticket.updated_at || ticket.created_at).toLocaleString('id-ID')}</span>
                          <span className="flex items-center gap-1"><MessageSquare size={12} /> {ticket.messages?.length || 1} pesan</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Chat View */}
            {viewMode === 'chat' && selectedTicket && (
              <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-[10px] font-medium text-amber-800 dark:text-amber-400 border-b border-amber-200 dark:border-amber-900/50 text-center shrink-0">
                  {selectedTicket.status === 'Selesai' 
                    ? 'Tiket ini telah diselesaikan. Anda dapat membalas pesan untuk membuka kembali tiket ini.' 
                    : 'Tim SaaS akan membalas pesan Anda di sini.'}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedTicket.messages?.map((msg, idx) => {
                    const isSelf = msg.role !== 'SaaS Admin';
                    return (
                      <div key={idx} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-bold text-slate-500">{msg.sender}</span>
                          <span className="text-[9px] text-slate-400">{new Date(msg.timestamp).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                          isSelf 
                            ? 'bg-emerald-600 text-white rounded-tr-sm shadow-md shadow-emerald-600/20' 
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-slate-700 shadow-sm'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={handleReply} className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
                  <div className="flex items-end gap-2">
                    <textarea 
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Ketik balasan..."
                      className="flex-1 p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                    <button 
                      type="submit" 
                      disabled={!replyText.trim() || isSubmitting}
                      className="p-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Form View (New Ticket) */}
            {viewMode === 'form' && (
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 bg-white dark:bg-slate-900">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <Monitor size={14} className="text-emerald-600 shrink-0" />
                    <span>Pelapor: <strong className="text-slate-900 dark:text-white font-bold">{authUser.name || 'Admin'}</strong></span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold text-[9px] rounded-full flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Topik <span className="text-rose-500">*</span></label>
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setFormData({ ...formData, type: 'bug' })} className={`p-2 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${formData.type === 'bug' ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}><Bug size={14} />Error</button>
                    <button type="button" onClick={() => setFormData({ ...formData, type: 'feature_request' })} className={`p-2 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${formData.type === 'feature_request' ? 'bg-indigo-600 text-white border-indigo-700 shadow-md shadow-indigo-600/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}><Sparkles size={14} />Usulan</button>
                    <button type="button" onClick={() => setFormData({ ...formData, type: 'question' })} className={`p-2 rounded-xl border text-[10px] font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${formData.type === 'question' ? 'bg-teal-600 text-white border-teal-700 shadow-md shadow-teal-600/20' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}><HelpCircle size={14} />Tanya</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Judul Kendala <span className="text-rose-500">*</span></label>
                    <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="misal: Tombol cetak Surat tidak merespons" className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Deskripsi Detail <span className="text-rose-500">*</span></label>
                    <textarea rows={4} required value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Jelaskan detail kendala yang dialami..." className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none" />
                  </div>
                </div>

                <div className="pt-3 flex justify-end">
                  <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors">
                    {isSubmitting ? <span className="animate-pulse">Mengirim...</span> : <><Send size={14} /> Kirim Laporan</>}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
};

export default GlobalBugReportButton;
