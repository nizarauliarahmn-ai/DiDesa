import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Menu, Database, ShieldAlert, CheckCircle, BellOff, CheckCheck, Clock, UserPlus, FileText, Gift, Info, Moon, Sun } from 'lucide-react';
import { getFormattedDate } from '../../utils/dateHelper';
import { showToast } from '../../utils/toast';
import { supabase } from '../../utils/supabase';
import { resolveCurrentTenant } from '../../utils/tenantResolver';

export default function AdminHeader({ 
  setActiveTab, 
  globalSearch = '', 
  setGlobalSearch,
  activeTab,
  toggleMobileMenu,
  className = ''
}: { 
  setActiveTab?: (tab: string) => void;
  globalSearch?: string;
  setGlobalSearch?: (val: string) => void;
  activeTab?: string;
  toggleMobileMenu?: () => void;
  className?: string;
}) {
  const [dbStatus, setDbStatus] = useState<{ engine: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [appTheme, setAppTheme] = useState(() => localStorage.getItem('app_theme') || 'light');

  useEffect(() => {
    const syncTheme = () => setAppTheme(localStorage.getItem('app_theme') || 'light');
    window.addEventListener('app_theme_updated', syncTheme);
    return () => window.removeEventListener('app_theme_updated', syncTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = appTheme === 'light' ? 'dark' : 'light';
    setAppTheme(newTheme);
    localStorage.setItem('app_theme', newTheme);
    window.dispatchEvent(new Event('app_theme_updated'));
  };
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const [searchQuery, setSearchQuery] = useState(globalSearch);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [residents, setResidents] = useState<any[]>([]);
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [hasLoadedResidents, setHasLoadedResidents] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchQuery(globalSearch);
  }, [globalSearch]);

  // Handle click outside for search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    }
    if (showSearchDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSearchDropdown]);

  // Load residents on-demand for search matching NIK or name
  useEffect(() => {
    if (searchQuery.trim().length >= 2 && !hasLoadedResidents && !loadingResidents) {
      setLoadingResidents(true);
      resolveCurrentTenant().then(tenantId => {
        if (!tenantId) {
          setLoadingResidents(false);
          return;
        }
        supabase.from('residents').select('*').eq('tenant_id', tenantId)
          .then(({ data }) => {
            if (data) {
              const formatted = data.map(r => ({ ...r, noKk: r.no_kk }));
              setResidents(formatted.filter(r => r.is_deleted !== 1));
            }
            setHasLoadedResidents(true);
            setLoadingResidents(false);
          });
      });
    }
  }, [searchQuery, hasLoadedResidents, loadingResidents]);

  const quickLinks = [
    { name: 'Kependudukan (Data Penduduk)', tab: 'penduduk', icon: <UserPlus className="w-4 h-4" /> },
    { name: 'Layanan Surat (Buat & Cetak Surat)', tab: 'surat', icon: <FileText className="w-4 h-4" /> },
    { name: 'Bantuan Sosial (Data & Overlap)', tab: 'bantuan', icon: <Gift className="w-4 h-4" /> },
    { name: 'Aspirasi Warga (Saran & Keluhan)', tab: 'aspirasi', icon: <Info className="w-4 h-4 text-purple-600" /> },
    { name: 'Pusat Notifikasi', tab: 'notifikasi', icon: <Bell className="w-4 h-4 text-emerald-600" /> },
  ];

  const filteredQuickLinks = searchQuery.trim().length > 0 
    ? quickLinks.filter(link => link.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const filteredResidents = searchQuery.trim().length >= 2
    ? residents.filter(r => 
        (r.name && r.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.nik && r.nik.includes(searchQuery)) ||
        (r.noKk && r.noKk.includes(searchQuery))
      ).slice(0, 5)
    : [];

  const filteredNotifications = searchQuery.trim().length >= 2
    ? notifications.filter(n => 
        (n.title && n.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (n.message && n.message.toLowerCase().includes(searchQuery.toLowerCase()))
      ).slice(0, 3)
    : [];

  const handleQuickLinkClick = (tab: string) => {
    if (setActiveTab) setActiveTab(tab);
    setSearchQuery('');
    if (setGlobalSearch) setGlobalSearch('');
    setShowSearchDropdown(false);
  };

  const handleResidentClick = (resident: any) => {
    if (setActiveTab) {
      setActiveTab('penduduk');
      if (setGlobalSearch) {
        setGlobalSearch(resident.nik);
      }
    }
    setShowSearchDropdown(false);
    showToast(`Membuka profil ${resident.name} 👤`, 'success');
  };

  const handleNotificationSearchClick = (item: any) => {
    handleNotificationClick(item);
    setSearchQuery('');
    if (setGlobalSearch) setGlobalSearch('');
    setShowSearchDropdown(false);
  };

  useEffect(() => {
    setDbStatus({ engine: 'Supabase (Multi-Tenant)' });

    const loadNotifications = async () => {
      const tenantId = await resolveCurrentTenant();
      if (!tenantId) return;
      
      const { data } = await supabase.from('notifications')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('timestamp', { ascending: false });
        
      if (data && Array.isArray(data)) {
        const formattedData = data.map(n => ({
          id: n.id,
          title: n.title,
          message: n.message,
          category: n.category,
          time: n.time || '',
          timestamp: n.timestamp,
          isRead: n.is_read
        }));
            try {
              const authUserStr = localStorage.getItem('didesa_auth_user');
              const role = authUserStr ? JSON.parse(authUserStr).role : 'unknown';
              
              let roleData = [];
              if (role === 'saas_admin') {
                roleData = data.filter(n => n.category === 'System');
                
                const saasReqsStr = localStorage.getItem('saas_letter_requests');
                if (saasReqsStr) {
                  const saasReqs = JSON.parse(saasReqsStr);
                  saasReqs.forEach((r: any) => {
                    roleData.unshift({
                      id: `saas-req-${r.id}`,
                      title: 'Pengajuan Tambah Surat',
                      message: `Desa ${r.villageName} mengajukan surat baru: ${r.letterName}.`,
                      category: 'System',
                      time: 'Baru saja',
                      timestamp: r.timestamp,
                      isRead: false
                    });
                  });
                }
              } else if (role === 'kades') {
                roleData = data.filter(n => n.category === 'System' || n.category === 'Assistance' || (n.title && n.title.toLowerCase().includes('persetujuan')));
              } else {
                roleData = data.filter(n => n.category !== 'System' || n.title.toLowerCase().includes('database'));
              }
              
              roleData.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

              const readIdsStr = localStorage.getItem(`didesa_read_notifs_${role}`);
              const readIds = readIdsStr ? JSON.parse(readIdsStr) : [];
              
              const modifiedData = roleData.map(n => ({
                ...n,
                isRead: readIds.includes(n.id)
              }));
              
              setNotifications(modifiedData);
              const count = modifiedData.filter((n: any) => !n.isRead).length;
              setUnreadCount(count);
            } catch(e) {
              setNotifications(formattedData);
              const count = formattedData.filter((n: any) => !n.isRead).length;
              setUnreadCount(count);
            }
          }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      // Don't modify backend so it doesn't affect other roles
      // Instead, save to local storage for this role
      const allIds = notifications.map(n => n.id);
      const authUserStr = localStorage.getItem('didesa_auth_user');
      const role = authUserStr ? JSON.parse(authUserStr).role : 'unknown';
      localStorage.setItem(`didesa_read_notifs_${role}`, JSON.stringify(allIds));
      
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const handleToggleRead = (id: string) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === id) {
        const newState = !n.isRead;
        try {
           const authUserStr = localStorage.getItem('didesa_auth_user');
           const role = authUserStr ? JSON.parse(authUserStr).role : 'unknown';
           const readIdsStr = localStorage.getItem(`didesa_read_notifs_${role}`);
           let readIds = readIdsStr ? JSON.parse(readIdsStr) : [];
           if (newState) {
             if (!readIds.includes(id)) readIds.push(id);
           } else {
             readIds = readIds.filter((rid: string) => rid !== id);
           }
           localStorage.setItem(`didesa_read_notifs_${role}`, JSON.stringify(readIds));
        } catch(e) {}
        return { ...n, isRead: newState };
      }
      return n;
    }));
    
    // Recalculate count
    setTimeout(() => {
      setNotifications(current => {
        const count = current.filter((n: any) => !n.isRead).length;
        setUnreadCount(count);
        return current;
      });
    }, 50);
  };

  const getCategoryMeta = (cat: string) => {
    switch(cat) {
      case 'Residents':
        return {
          icon: <UserPlus className="w-4 h-4" />,
          colorBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          labelText: 'Kependudukan'
        };
      case 'Services':
        return {
          icon: <FileText className="w-4 h-4" />,
          colorBg: 'bg-blue-50 text-blue-700 border-blue-100',
          labelText: 'Layanan'
        };
      case 'Assistance':
        return {
          icon: <Gift className="w-4 h-4" />,
          colorBg: 'bg-amber-50 text-amber-700 border-amber-100',
          labelText: 'Bantuan'
        };
      case 'System':
      default:
        return {
          icon: <Info className="w-4 h-4" />,
          colorBg: 'bg-purple-50 text-purple-700 border-purple-100',
          labelText: 'Sistem'
        };
    }
  };

  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    if (showNotifDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotifDropdown]);

  const handleNotificationClick = (item: any) => {
    // Mark as read
    if (!item.isRead) {
      handleToggleRead(item.id);
    }
    
    // Navigation logic
    const title = item.title.toLowerCase();
    const msg = item.message.toLowerCase();
    
    if (title.includes('persetujuan') || title.includes('approval') || msg.includes('menunggu persetujuan')) {
      if (setActiveTab) setActiveTab('antrean');
    } else if (title.includes('penduduk') || msg.includes('penduduk')) {
      if (setActiveTab) setActiveTab('penduduk');
    } else if (title.includes('surat') || msg.includes('surat')) {
      if (setActiveTab) setActiveTab('surat');
    } else if (title.includes('keuangan') || msg.includes('keuangan')) {
      if (setActiveTab) setActiveTab('keuangan');
    } else if (title.includes('bantuan') || msg.includes('bantuan')) {
      if (setActiveTab) setActiveTab('bantuan');
    } else if (title.includes('aspirasi') || msg.includes('aspirasi')) {
      if (setActiveTab) setActiveTab('aspirasi');
    }
    
    setShowNotifDropdown(false);
  };

  return (
    <header className={`print:hidden h-16 bg-slate-50/60 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-slate-700 flex items-center justify-between px-6 z-50 ${className}`}>
      <div className="flex items-center gap-4 flex-1">
        <button onClick={toggleMobileMenu} className="lg:hidden p-2 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <Menu size={24} />
        </button>
        <div ref={searchRef} className="hidden md:flex relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Cari penduduk, NIK, atau fitur cepat..." 
            value={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              setSearchQuery(val);
              if (setGlobalSearch) {
                setGlobalSearch(val);
              }
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-slate-800 border-none rounded-full w-full focus:ring-2 focus:ring-emerald-500 text-sm outline-none transition-all"
          />

          {showSearchDropdown && searchQuery.trim().length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Header */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-gray-400 tracking-wider uppercase">Pencarian Global</span>
                {loadingResidents && (
                  <span className="text-[10px] text-emerald-600 font-semibold animate-pulse">Memuat data...</span>
                )}
              </div>

              {/* Empty state */}
              {filteredQuickLinks.length === 0 && filteredResidents.length === 0 && filteredNotifications.length === 0 && (
                <div className="p-6 text-center text-gray-400">
                  <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs">Tidak ada hasil untuk "{searchQuery}"</p>
                  <p className="text-[10px] text-gray-400 mt-1">Ketik nama penduduk, NIK, atau halaman menu</p>
                </div>
              )}

              {/* Quick Navigation Links */}
              {filteredQuickLinks.length > 0 && (
                <div className="p-2 border-b border-gray-50">
                  <div className="px-2.5 py-1 text-[9px] font-extrabold tracking-wider text-gray-400 uppercase">Menu Cepat</div>
                  <div className="mt-1 space-y-0.5">
                    {filteredQuickLinks.map(link => (
                      <button
                        key={link.tab}
                        onClick={() => handleQuickLinkClick(link.tab)}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-slate-300 hover:bg-emerald-50/50 hover:text-emerald-700 transition-all flex items-center gap-2"
                      >
                        <div className="p-1 rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400">
                          {link.icon}
                        </div>
                        <span>{link.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Resident matches */}
              {filteredResidents.length > 0 && (
                <div className="p-2 border-b border-gray-50">
                  <div className="px-2.5 py-1 text-[9px] font-extrabold tracking-wider text-gray-400 uppercase">Data Penduduk</div>
                  <div className="mt-1 space-y-0.5">
                    {filteredResidents.map(r => (
                      <button
                        key={r.nik}
                        onClick={() => handleResidentClick(r)}
                        className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-gray-700 dark:text-slate-300 hover:bg-emerald-50/50 hover:text-emerald-700 transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px] flex-shrink-0">
                            NIK
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-gray-800 dark:text-slate-100">{r.name}</div>
                            <div className="text-[10px] text-gray-400">NIK: {r.nik}</div>
                          </div>
                        </div>
                        <span className="text-[9px] text-emerald-600 font-bold">Profil 👤</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notification matches */}
              {filteredNotifications.length > 0 && (
                <div className="p-2">
                  <div className="px-2.5 py-1 text-[9px] font-extrabold tracking-wider text-gray-400 uppercase">Notifikasi</div>
                  <div className="mt-1 space-y-0.5">
                    {filteredNotifications.map(item => {
                      const meta = getCategoryMeta(item.category);
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNotificationSearchClick(item)}
                          className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-gray-700 dark:text-slate-300 hover:bg-emerald-50/50 hover:text-emerald-700 transition-all flex items-center gap-2"
                        >
                          <div className={`p-1 rounded border flex-shrink-0 ${meta.colorBg}`}>
                            {meta.icon}
                          </div>
                          <div className="truncate flex-1">
                            <div className="font-bold text-gray-800 dark:text-slate-100 truncate">{item.title}</div>
                            <div className="text-[10px] text-gray-400 truncate">{item.message}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-6">
                {/* Database Status Badge */}
        {dbStatus && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-tight">
            {dbStatus.engine === "Drizzle" ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-2.5 py-1 rounded-full">
                <CheckCircle className="w-3.5 h-3.5" />
                PostgreSQL Aktif
              </span>
            ) : dbStatus.engine.includes("Supabase") ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-2.5 py-1 rounded-full">
                <CheckCircle className="w-3.5 h-3.5" />
                Online (Supabase Cloud)
              </span>
            ) : (
              <span 
                className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200/50 px-2.5 py-1 rounded-full cursor-help" 
                title="Database cloud tidak terhubung / salah ketik di .env. Menggunakan memori sementara."
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Offline Mode (Demo)
              </span>
            )}
          </div>
        )}

        {/* Dark Mode Toggle */}
        <button 
          onClick={toggleTheme}
          title={appTheme === 'light' ? "Aktifkan Mode Gelap" : "Aktifkan Mode Terang"}
          className="relative p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-full transition-all cursor-pointer flex items-center justify-center hover:scale-105"
        >
          {appTheme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-full transition-colors"
            title="Buka Notifikasi Pusat"
          >
            <Bell size={20} className={unreadCount > 0 ? "text-emerald-700" : ""} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center px-1 border border-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-slate-50/50 flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-gray-800 dark:text-slate-100 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-emerald-700" />
                  Notifikasi Baru
                </h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAllAsRead();
                    }}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Tandai Semua Dibaca
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center">
                    <BellOff className="w-8 h-8 text-gray-300 mb-2" />
                    <p className="text-xs">Tidak ada notifikasi baru</p>
                  </div>
                ) : (
                  notifications.map((item) => {
                    const meta = getCategoryMeta(item.category);
                    return (
                      <div 
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={`p-3.5 flex gap-3 items-start hover:bg-slate-50/80 transition-all cursor-pointer relative ${
                          !item.isRead ? 'bg-emerald-50/10' : ''
                        }`}
                      >
                        {!item.isRead && (
                          <div className="absolute top-0 bottom-0 left-0 w-1 bg-emerald-600 rounded-r"></div>
                        )}
                        <div className={`p-2 rounded-lg border flex-shrink-0 ${meta.colorBg}`}>
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <h4 className={`text-xs truncate ${!item.isRead ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-500 dark:text-slate-400 font-semibold'}`}>
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-1 flex-shrink-0 text-[10px] text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>{item.time || new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                          <p className={`text-[11px] leading-normal ${!item.isRead ? 'text-gray-800 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>
                            {item.message}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[9px] text-gray-400">
                              {new Date(item.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                            </span>
                            {!item.isRead && (
                              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-3 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-center">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNotifDropdown(false);
                    if (setActiveTab) setActiveTab('notifikasi');
                  }}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors w-full py-1"
                >
                  Lihat Semua Notifikasi
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="h-6 w-[1px] bg-gray-200"></div>
        <span className="text-sm font-medium text-gray-500 dark:text-slate-400 hidden sm:block">{getFormattedDate()}</span>
      </div>
    </header>
  );
}
