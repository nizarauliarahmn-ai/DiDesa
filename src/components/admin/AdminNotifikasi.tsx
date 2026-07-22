import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  BellOff, 
  CheckCheck, 
  Search, 
  UserPlus, 
  FileText, 
  Gift, 
  Info, 
  Clock, 
  Plus, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: "Residents" | "Services" | "Assistance" | "System";
  time: string;
  timestamp: string;
  isRead: boolean;
}

export default function AdminNotifikasi({
  searchQuery: externalSearchQuery,
  setSearchQuery: externalSetSearchQuery,
  debouncedSearchQuery: externalDebouncedSearchQuery
}: {
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  debouncedSearchQuery?: string;
} = {}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [localDebouncedSearchQuery, setLocalDebouncedSearchQuery] = useState("");
  
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = externalSetSearchQuery !== undefined ? externalSetSearchQuery : setLocalSearchQuery;

  // Handle local debouncing if no external debounced query is provided
  useEffect(() => {
    if (externalDebouncedSearchQuery !== undefined) return;
    const timer = setTimeout(() => {
      setLocalDebouncedSearchQuery(localSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearchQuery, externalDebouncedSearchQuery]);

  const debouncedSearchQuery = externalDebouncedSearchQuery !== undefined ? externalDebouncedSearchQuery : localDebouncedSearchQuery;
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'Residents' | 'Services' | 'Assistance' | 'System'>('all');
  
  // Custom simulation states
  const [simTitle, setSimTitle] = useState("");
  const [simMessage, setSimMessage] = useState("");
  const [simCategory, setSimCategory] = useState<"Residents" | "Services" | "Assistance" | "System">("System");
  const [showSimModal, setShowSimModal] = useState(false);
  const [simSuccess, setSimSuccess] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const resolvedTenant = await resolveCurrentTenant();
      setTenantId(resolvedTenant);

      if (resolvedTenant) {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('tenant_id', resolvedTenant)
          .order('timestamp', { ascending: false });

        if (data && !error) {
          const formatted = data.map(n => ({
            id: n.id,
            title: n.title,
            message: n.message,
            category: n.category as any,
            time: n.time || '',
            timestamp: n.timestamp,
            isRead: n.is_read
          }));
          setNotifications(formatted);
        }
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Listen for custom event to trigger immediate refresh
    const handleNotificationUpdate = () => {
      fetchNotifications();
    };
    window.addEventListener('notifications_updated', handleNotificationUpdate);

    // Poll every 15 seconds to keep dashboard notification center live and ticking!
    const interval = setInterval(fetchNotifications, 15000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications_updated', handleNotificationUpdate);
    };
  }, []);

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    if (!tenantId) return;
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('tenant_id', tenantId)
        .eq('is_read', false);

      if (!error) {
        // Optimistic UI update or refresh
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  // Add custom simulated notification
  const handleSimulateNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simTitle || !simMessage || !tenantId) return;

    try {
      const newId = `notif-${Date.now()}`;
      const payload = {
        id: newId,
        tenant_id: tenantId,
        title: simTitle,
        message: simMessage,
        category: simCategory,
        time: 'Baru saja',
        is_read: false
      };

      const { error } = await supabase.from('notifications').insert([payload]);

      if (!error) {
        await fetchNotifications(); // Refresh to get proper timestamp
        setSimTitle("");
        setSimMessage("");
        setSimSuccess(true);
        setTimeout(() => {
          setSimSuccess(false);
          setShowSimModal(false);
        }, 1200);
      }
    } catch (err) {
      console.error("Error simulating notification:", err);
    }
  };

  // Toggle specific notification read state (local memory helper)
  const toggleReadStatus = async (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (notif && tenantId) {
      await supabase.from('notifications').update({ is_read: !notif.isRead }).eq('id', id).eq('tenant_id', tenantId);
    }
    setNotifications(prev => prev.map(n => {
      if (n.id === id) {
        return { ...n, isRead: !n.isRead };
      }
      return n;
    }));
  };

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notif => {
      // 1. Filter by category/read
      if (activeFilter === 'unread' && notif.isRead) return false;
      if (activeFilter !== 'all' && activeFilter !== 'unread' && notif.category !== activeFilter) return false;

      // 2. Filter by search query
      if (debouncedSearchQuery.trim() !== "") {
        const q = debouncedSearchQuery.toLowerCase();
        return (
          notif.title.toLowerCase().includes(q) ||
          notif.message.toLowerCase().includes(q) ||
          notif.category.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [notifications, activeFilter, debouncedSearchQuery]);

  // Unread count helper
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  // Category renderer utilities
  const getCategoryMeta = (cat: string) => {
    switch(cat) {
      case 'Residents':
        return {
          icon: <UserPlus className="w-5 h-5" />,
          colorBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          labelBg: 'bg-emerald-50 text-emerald-700',
          badgeText: 'Kependudukan'
        };
      case 'Services':
        return {
          icon: <FileText className="w-5 h-5" />,
          colorBg: 'bg-blue-100 text-blue-800 border-blue-200',
          labelBg: 'bg-blue-50 text-blue-700',
          badgeText: 'Layanan Surat'
        };
      case 'Assistance':
        return {
          icon: <Gift className="w-5 h-5" />,
          colorBg: 'bg-amber-100 text-amber-800 border-amber-200',
          labelBg: 'bg-amber-50 text-amber-700',
          badgeText: 'Program Bantuan'
        };
      case 'System':
      default:
        return {
          icon: <Info className="w-5 h-5" />,
          colorBg: 'bg-purple-100 text-purple-800 border-purple-200',
          labelBg: 'bg-purple-50 text-purple-700',
          badgeText: 'Sistem'
        };
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Header Section */}
      <div className="sticky top-16 z-40 bg-slate-50/60 dark:bg-slate-900/80 backdrop-blur-xl pb-4 -mx-4 -mt-4 px-4 pt-4 md:-mx-6 md:-mt-6 md:px-6 md:pt-6 lg:-mx-8 lg:-mt-8 lg:px-8 lg:pt-8 border-b border-slate-200/50 dark:border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Bell className="text-emerald-700 w-7 h-7" />
            Notifikasi Pusat Kontrol
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Pantau aktivitas pendaftaran, perubahan kependudukan, pengajuan layanan, dan pembaruan sistem secara langsung.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button 
            onClick={() => setShowSimModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-sm font-bold border border-emerald-200 transition-colors"
          >
            <Plus size={16} />
            Simulasi Notifikasi
          </button>
          <button 
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors border ${
              unreadCount > 0 
                ? 'bg-emerald-700 text-white border-emerald-600 hover:bg-emerald-800' 
                : 'bg-gray-100 dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 cursor-not-allowed'
            }`}
          >
            <CheckCheck size={16} />
            Tandai Semua Dibaca
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200/80 shadow-sm dark:shadow-none overflow-hidden">
        {/* Search & Filter Header */}
        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-slate-800 bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Filters */}
          <div className="flex flex-wrap gap-1.5 self-start md:self-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeFilter === 'all' 
                  ? 'bg-emerald-800 text-white' 
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              Semua {notifications.length > 0 && `(${notifications.length})`}
            </button>
            <button
              onClick={() => setActiveFilter('unread')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                activeFilter === 'unread' 
                  ? 'bg-emerald-800 text-white' 
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              Belum Dibaca 
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveFilter('Residents')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeFilter === 'Residents' 
                  ? 'bg-emerald-800 text-white' 
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              Kependudukan
            </button>
            <button
              onClick={() => setActiveFilter('Services')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeFilter === 'Services' 
                  ? 'bg-emerald-800 text-white' 
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              Layanan
            </button>
            <button
              onClick={() => setActiveFilter('Assistance')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeFilter === 'Assistance' 
                  ? 'bg-emerald-800 text-white' 
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              Bantuan
            </button>
            <button
              onClick={() => setActiveFilter('System')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeFilter === 'System' 
                  ? 'bg-emerald-800 text-white' 
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800'
              }`}
            >
              Sistem
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kata kunci notifikasi..."
              className="pl-9 pr-4 py-1.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl w-full text-xs text-gray-700 dark:text-slate-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Notifications List */}
        {loading && notifications.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-800 mx-auto mb-3"></div>
            <p className="text-sm">Memuat daftar notifikasi...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center text-gray-500 dark:text-slate-400 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-4 border border-gray-100 dark:border-slate-800">
              <BellOff className="text-gray-400 w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-gray-800 dark:text-slate-100">Tidak Ada Notifikasi</h3>
            <p className="text-xs text-gray-400 max-w-sm mt-1">
              {searchQuery.trim() !== "" 
                ? "Tidak menemukan notifikasi yang cocok dengan pencarian Anda." 
                : "Semua berita dan riwayat mutasi data akan muncul di bagian ini."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((item) => {
              const meta = getCategoryMeta(item.category);
              return (
                <div 
                  key={item.id}
                  onClick={() => toggleReadStatus(item.id)}
                  className={`p-4 md:p-5 flex gap-4 items-start hover:bg-slate-50/50 transition-all cursor-pointer relative ${
                    !item.isRead ? 'bg-emerald-50/20' : ''
                  }`}
                >
                  {/* Unread indicator line */}
                  {!item.isRead && (
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-emerald-600 rounded-r"></div>
                  )}

                  {/* Icon */}
                  <div className={`p-2.5 rounded-xl border flex-shrink-0 ${meta.colorBg}`}>
                    {meta.icon}
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className={`text-sm font-bold truncate ${
                        !item.isRead ? 'text-gray-900 dark:text-white font-extrabold' : 'text-gray-700 dark:text-slate-300 font-semibold'
                      }`}>
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0 text-[11px] text-gray-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{item.time || new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {!item.isRead && (
                          <span className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse"></span>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs leading-relaxed ${
                      !item.isRead ? 'text-gray-800 dark:text-slate-100 font-medium' : 'text-gray-500 dark:text-slate-400'
                    }`}>
                      {item.message}
                    </p>
                    
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${meta.labelBg}`}>
                        {meta.badgeText}
                      </span>
                      <span className="text-[10px] text-gray-400/80">
                        {new Date(item.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Simulation Modal */}
      {showSimModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 ease-out">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                <Bell className="text-emerald-700 w-5 h-5" />
                Simulasikan Notifikasi
              </h3>
              <button 
                onClick={() => setShowSimModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSimulateNotification} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Judul Notifikasi</label>
                <input 
                  type="text" 
                  required
                  placeholder="Misal: Penyaluran Bantuan Selesai"
                  value={simTitle}
                  onChange={(e) => setSimTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Pesan / Konten</label>
                <textarea 
                  required
                  rows={3}
                  placeholder="Deskripsi detail apa yang baru saja diperbarui atau terjadi..."
                  value={simMessage}
                  onChange={(e) => setSimMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-slate-400 mb-1">Kategori</label>
                <select 
                  value={simCategory}
                  onChange={(e) => setSimCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                >
                  <option value="Residents">Kependudukan (Residents)</option>
                  <option value="Services">Layanan (Services)</option>
                  <option value="Assistance">Bantuan (Assistance)</option>
                  <option value="System">Sistem (System)</option>
                </select>
              </div>

              {simSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
                  <Check className="w-4 h-4 text-emerald-700" />
                  Berhasil mengirimkan notifikasi simulasi!
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSimModal(false)}
                  className="px-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm dark:shadow-none"
                >
                  Kirim Notifikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
