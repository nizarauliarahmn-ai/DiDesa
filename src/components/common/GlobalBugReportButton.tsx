import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  LifeBuoy, Bug, X, Send, AlertTriangle, CheckCircle2, 
  HelpCircle, Sparkles, MessageSquare, Info, ShieldAlert, Monitor, Clock, ChevronLeft, Plus,
  Paperclip, FileText, Download, Loader2
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { submitBugReportOnline, fetchVillageBugReportsOnline, replyToBugReportOnline, BugReport, SETTINGS_KEY, uploadChatAttachment, compressImage, formatFileSize, MAX_DOCUMENT_SIZE } from '../../utils/bugReportService';
import { supabase } from '../../utils/supabase';
import { showToast } from '../../utils/toast';

// Batas waktu penyimpanan tiket berstatus 'Selesai' sebelum otomatis diarsipkan dari daftar.
const COMPLETED_TICKET_EXPIRY_DAYS = 7;

export const GlobalBugReportButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [viewMode, setViewMode] = useState<'list' | 'chat' | 'form'>('list');
  const [tickets, setTickets] = useState<BugReport[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<BugReport | null>(null);
  const [replyText, setReplyText] = useState('');

  // Attachment state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [attachmentCompressedSize, setAttachmentCompressedSize] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

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

  const [unreadCount, setUnreadCount] = useState(0);
  const lastRefreshRef = useRef(0);

  const READ_KEY = 'saas_help_read_state';
  const getReadState = (): Record<string, number> => {
    try {
      return JSON.parse(localStorage.getItem(READ_KEY) || '{}');
    } catch {
      return {};
    }
  };
  const computeUnread = (list: BugReport[]): number => {
    const read = getReadState();
    return list.filter(t => {
      const msgs = t.messages || [];
      const last = msgs[msgs.length - 1];
      return !!last && last.role === 'SaaS Admin' && Date.parse(last.timestamp) > (read[t.id] || 0);
    }).length;
  };

  const filterRetainedTickets = useCallback((list: BugReport[]): BugReport[] => {
    const cutoff = Date.now() - COMPLETED_TICKET_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    return list.filter(t => {
      if (t.status !== 'Selesai') return true;
      const doneAt = Date.parse(t.updated_at || t.created_at) || 0;
      return doneAt >= cutoff;
    });
  }, []);

  const ticketsRef = useRef<BugReport[]>([]);

  const hasUnreadResponse = useCallback((t: BugReport): boolean => {
    const msgs = t.messages || [];
    const last = msgs[msgs.length - 1];
    return !!last && last.role === 'SaaS Admin' && Date.parse(last.timestamp) > (getReadState()[t.id] || 0);
  }, []);

  const markTicketRead = useCallback((id: string) => {
    const read = getReadState();
    read[id] = Date.now();
    localStorage.setItem(READ_KEY, JSON.stringify(read));
    setUnreadCount(computeUnread(ticketsRef.current));
  }, []);

  const decideInitialView = useCallback((list: BugReport[]) => {
    const replied = list.filter(t => {
      const msgs = t.messages || [];
      const last = msgs[msgs.length - 1];
      return !!last && last.role === 'SaaS Admin';
    });
    const candidates = replied.length
      ? replied
      : list.filter(t => t.status === 'Menunggu' || t.status === 'Diproses');
    if (candidates.length) {
      const target = [...candidates].sort(
        (a, b) => Date.parse(b.updated_at || b.created_at) - Date.parse(a.updated_at || a.created_at)
      )[0];
      setSelectedTicket(target);
      setViewMode('chat');
      markTicketRead(target.id);
    } else {
      setViewMode('list');
    }
  }, [markTicketRead]);

  const applyTickets = useCallback((data: BugReport[], markRead: boolean) => {
    const retained = filterRetainedTickets(data);
    ticketsRef.current = retained;
    setTickets(retained);
    if (markRead) {
      const read = getReadState();
      retained.forEach(t => { read[t.id] = Date.now(); });
      localStorage.setItem(READ_KEY, JSON.stringify(read));
      setUnreadCount(0);
    } else {
      setUnreadCount(computeUnread(retained));
    }
  }, [filterRetainedTickets]);

  const fetchTickets = useCallback(async (markRead = false) => {
    const data = await fetchVillageBugReportsOnline();
    applyTickets(data, markRead);
  }, [applyTickets]);

  useEffect(() => {
    if (isOpen) {
      (async () => {
        const data = await fetchVillageBugReportsOnline();
        applyTickets(data, false);
        decideInitialView(filterRetainedTickets(data));
      })();
    }
  }, [isOpen, applyTickets, decideInitialView, filterRetainedTickets]);

  // Polling berkala untuk badge notifikasi (tidak perlu refresh halaman)
  useEffect(() => {
    fetchTickets(false);
    const id = setInterval(() => fetchTickets(false), 20000);
    return () => clearInterval(id);
  }, [fetchTickets]);

  // Realtime Supabase (best-effort; jika tidak aktif, polling tetap jalan)
  useEffect(() => {
    let channel: any = null;
    try {
      channel = supabase
        .channel('saas-bantuan-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'saas_settings', filter: `key=eq.${SETTINGS_KEY}` }, async () => {
          const now = Date.now();
          if (now - lastRefreshRef.current < 3000) return;
          lastRefreshRef.current = now;
          await fetchTickets(false);
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime bantuan SaaS tidak tersedia:', e);
    }
    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [fetchTickets]);

  // Tutup dengan tombol Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchTickets(false);
    };
    window.addEventListener('bug_reports_updated', handleUpdate);
    return () => window.removeEventListener('bug_reports_updated', handleUpdate);
  }, [fetchTickets]);

  const handleOpen = () => {
    setIsOpen(true);
    if (tickets.length) {
      decideInitialView(tickets);
    }
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
    if ((!replyText.trim() && !attachment) || !selectedTicket) return;

    setIsSubmitting(true);
    try {
      let uploaded: { url: string; type: 'image' | 'document'; name: string } | null = null;
      if (attachment) {
        setIsUploading(true);
        uploaded = await uploadChatAttachment(selectedTicket.id, attachment);
      }

      const success = await replyToBugReportOnline(selectedTicket.id, {
        sender: authUser.name || 'Admin',
        role: authUser.role === 'kades' ? 'Super Admin' : 'Admin Desa',
        text: replyText,
        attachment_url: uploaded?.url,
        attachment_type: uploaded?.type,
        file_name: uploaded?.name
      });

      if (success) {
        setReplyText('');
        setAttachment(null);
        setAttachmentPreview(null);
        setAttachmentCompressedSize(null);
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
      setIsUploading(false);
    }
  };

  const handleAttachmentChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    if (!isImage && file.size > MAX_DOCUMENT_SIZE) {
      showToast('Ukuran dokumen maksimal 5 MB agar sistem tetap ringan.', 'error');
      return;
    }

    setAttachment(file);
    setAttachmentPreview(null);
    setAttachmentCompressedSize(null);

    if (isImage) {
      setIsCompressing(true);
      try {
        const compressed = await compressImage(file);
        setAttachmentCompressedSize(compressed.size);
        setAttachmentPreview(URL.createObjectURL(compressed));
      } catch {
        setAttachmentPreview(URL.createObjectURL(file));
      } finally {
        setIsCompressing(false);
      }
    } else {
      setAttachmentPreview(null);
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    setAttachmentCompressedSize(null);
  };

  useEffect(() => {
    if (!attachmentPreview) return;
    return () => URL.revokeObjectURL(attachmentPreview);
  }, [attachmentPreview]);

  return (
    <>
      {/* Floating Action Button (FAB) - Positioned Fixed at Bottom Right */}
      <div className="fixed bottom-6 right-6 z-[90] flex items-center gap-2">
        <button
          onClick={handleOpen}
          className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-full font-bold shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 ease-in-out active:scale-95 cursor-pointer border border-emerald-400/30"
          title={isOpen ? 'Tutup Pusat Bantuan' : 'Hubungi Pusat Bantuan / Laporkan Kendala'}
        >
          {unreadCount > 0 && (
            <>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-400 animate-ping" />
              <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white shadow-md shadow-rose-500/40 z-10">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </>
          )}
          <div className="relative w-6 h-6 shrink-0">
            <AnimatePresence initial={false}>
              {isOpen ? (
                <motion.div
                  key="close"
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <X size={24} />
                </motion.div>
              ) : (
                <motion.div
                  key="chat"
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <MessageSquare size={24} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </button>
      </div>

      {/* MODAL FORM LAPORAN BUG / KENDALA */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop transparan: klik di luar untuk menutup */}
            <motion.div
              className="fixed inset-0 z-[100]"
              onClick={() => setIsOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="fixed bottom-24 right-6 z-[110] flex items-end justify-end p-0 origin-bottom-right"
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <div className="bg-white dark:bg-slate-900 rounded-3xl w-[380px] sm:w-[420px] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[75vh] min-h-[500px] overflow-hidden shadow-emerald-900/20">
            
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
                        onClick={() => { markTicketRead(ticket.id); setSelectedTicket(ticket); setViewMode('chat'); }}
                        className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 cursor-pointer transition-all shadow-sm group"
                      >
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">{ticket.title}</h4>
                            {hasUnreadResponse(ticket) && (
                              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shrink-0" title="Ada balasan baru belum dibaca" />
                            )}
                          </div>
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
                            ? 'bg-amber-400 text-slate-900 rounded-tr-sm shadow-md shadow-amber-400/40' 
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-slate-700 shadow-sm'
                        }`}>
                          {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                          {msg.attachment_url && msg.attachment_type === 'image' && (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(msg.attachment_url!)}
                              className="mt-2 block max-w-[200px] cursor-pointer group"
                            >
                              <img
                                src={msg.attachment_url}
                                alt={msg.file_name || 'Lampiran gambar'}
                                className="rounded-xl max-w-[200px] cursor-pointer hover:opacity-90 border border-black/10 group-hover:ring-2 group-hover:ring-emerald-500/30 transition-all"
                                loading="lazy"
                              />
                            </button>
                          )}
                          {msg.attachment_url && msg.attachment_type === 'document' && (
                            <a
                              href={msg.attachment_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              download={msg.file_name || 'lampiran'}
                              className="mt-2 flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-900/60 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            >
                              <FileText size={16} className="text-emerald-600 shrink-0" />
                              <span className="truncate flex-1 text-left">{msg.file_name || 'Dokumen lampiran'}</span>
                              <Download size={14} className="text-slate-400 shrink-0" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <form onSubmit={handleReply} className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shrink-0">
                  {attachment && (
                    <div className="mb-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2.5">
                      {attachment.type.startsWith('image/') ? (
                        attachmentPreview ? (
                          <img src={attachmentPreview} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-slate-600 shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                            <Loader2 size={16} className="text-emerald-600 animate-spin" />
                          </div>
                        )
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-blue-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{attachment.name}</p>
                        <p className="text-[9px] text-slate-400 font-medium">
                          {isCompressing
                            ? 'Mengompresi gambar...'
                            : attachmentCompressedSize !== null
                              ? `${formatFileSize(attachment.size)} → ${formatFileSize(attachmentCompressedSize)}`
                              : formatFileSize(attachment.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={clearAttachment}
                        disabled={isUploading}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                        aria-label="Hapus lampiran"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-end gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg, image/png, image/webp, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-excel"
                      className="hidden"
                      onChange={handleAttachmentChange}
                      disabled={isUploading}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading || isCompressing}
                      className="p-2.5 rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors shrink-0 cursor-pointer disabled:opacity-40"
                      aria-label="Lampirkan file"
                      title="Lampirkan gambar / dokumen"
                    >
                      {isCompressing ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                    </button>
                    <textarea 
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Ketik balasan..."
                      className="flex-1 p-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                    />
                    <button 
                      type="submit" 
                      disabled={(!replyText.trim() && !attachment) || isSubmitting || isUploading || isCompressing}
                      className="p-3 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0 cursor-pointer"
                    >
                      {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox Preview Gambar */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setLightboxUrl(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
              aria-label="Tutup preview"
            >
              <X size={20} />
            </button>
            <motion.img
              src={lightboxUrl}
              alt="Preview lampiran"
              className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default GlobalBugReportButton;
