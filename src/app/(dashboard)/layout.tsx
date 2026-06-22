'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BarChart3, 
  Package, 
  TrendingUp, 
  HelpCircle, 
  Sliders, 
  ShieldAlert, 
  Bell, 
  LogOut, 
  User, 
  RefreshCw, 
  ChevronDown, 
  Check, 
  Menu, 
  X,
  FileText,
  AlertCircle,
  Sun,
  Moon,
  Home as HomeIcon,
  ShoppingBag
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeProvider';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const { theme, toggleTheme, user: preloadedUser, loadingUser, showAlert } = useTheme();
  const [user, setUser] = useState<{ email: string; role: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappInfo, setWhatsappInfo] = useState<{ status: string; qr: string | null }>({ status: 'DISCONNECTED', qr: null });
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchWhatsAppStatus = async () => {
    try {
      const res = await fetch(`/api/whatsapp/status?t=\${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setWhatsappInfo(data);
        if (data.status === 'CONNECTED') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      }
    } catch (err) {
      console.error('Error fetching whatsapp status:', err);
    }
  };

  const handleConnectWhatsApp = async () => {
    setLoadingWhatsapp(true);
    try {
      const res = await fetch(`/api/whatsapp/status?t=\${Date.now()}`, { method: 'POST', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setWhatsappInfo(data);
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(fetchWhatsAppStatus, 2000);
      }
    } catch (err) {
      console.error('Error connecting whatsapp:', err);
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const handleDisconnectWhatsApp = async () => {
    setLoadingWhatsapp(true);
    try {
      const res = await fetch(`/api/whatsapp/status?t=\${Date.now()}`, { method: 'DELETE', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setWhatsappInfo({ status: data.status, qr: null });
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        showAlert('WhatsApp Disconnected', 'WhatsApp connection has been closed.', 'success');
      }
    } catch (err) {
      console.error('Error disconnecting whatsapp:', err);
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  // Poll status when modal is open and not connected
  useEffect(() => {
    if (showWhatsAppModal) {
      fetchWhatsAppStatus();
      pollingRef.current = setInterval(fetchWhatsAppStatus, 2000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [showWhatsAppModal]);


  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (!loadingUser) {
      if (!preloadedUser) {
        router.push('/login');
      } else {
        setUser(preloadedUser);
        setLoading(false);
      }
    }
  }, [loadingUser, preloadedUser]);

  useEffect(() => {
    if (!preloadedUser) return;
    fetchNotifications();

    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [preloadedUser]);

  // Close dropdowns on outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
      if (roleSwitcherRef.current && !roleSwitcherRef.current.contains(target)) {
        setShowRoleSwitcher(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleRoleSwitch = async (role: string) => {
    try {
      const res = await fetch('/api/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setShowRoleSwitcher(false);
        // Refresh page data
        window.location.reload();
      }
    } catch (err) {
      console.error('Role switcher error:', err);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
      }
    } catch (err) {
      console.error('Error reading notification:', err);
    }
  };

  const handleDeleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering mark as read
    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleSyncCompetitors = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/competitor-prices/sync', { method: 'POST' });
      if (res.ok) {
        await fetchNotifications();
        // Log synced successfully
        showAlert('Intelligence Synced', 'Competitor intelligence sync completed! New pricing snapshots generated.', 'success');
      } else {
        const data = await res.json();
        showAlert('Sync Failed', data.error || 'Failed to sync competitor prices.', 'error');
      }
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center theme-transition" style={{ background: 'var(--pp-bg-primary)' }}>
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-medium animate-pulse" style={{ color: 'var(--pp-text-secondary)' }}>Loading PricePilot...</p>
      </div>
    );
  }

  const navLinks = [
    { href: '/home', label: 'Home', icon: HomeIcon, roles: ['Admin', 'Pricing Analyst', 'Manager', 'Viewer'] },
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3, roles: ['Admin', 'Pricing Analyst', 'Manager', 'Viewer'] },
    { href: '/products', label: 'Catalog Management', icon: Package, roles: ['Admin', 'Pricing Analyst', 'Viewer'] },
    { href: '/recommendations', label: 'Pricing Engine', icon: TrendingUp, roles: ['Admin', 'Pricing Analyst', 'Manager', 'Viewer'] },
    { href: '/competitors', label: 'Competitors', icon: HelpCircle, roles: ['Admin', 'Pricing Analyst', 'Manager', 'Viewer'] },
    { href: '/sales', label: 'Sales', icon: ShoppingBag, roles: ['Admin', 'Pricing Analyst', 'Manager', 'Viewer'] },
    { href: '/logs', label: 'Audit Trail', icon: FileText, roles: ['Admin', 'Pricing Analyst', 'Manager'] }
  ];

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen flex flex-col theme-transition" style={{ background: 'var(--pp-bg-primary)', color: 'var(--pp-text-primary)' }}>
      
      {/* Top Header Navigation - Desktop & Mobile */}
      <header className="sticky top-0 z-40 h-20 flex items-center justify-between px-6 lg:px-10 border-b glass-header" style={{ borderColor: 'var(--pp-border)' }}>
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 flex-1 lg:flex-initial lg:w-[380px]">
          {/* Mobile menu toggle */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            style={{ color: 'var(--pp-text-secondary)' }}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <Link href="/dashboard" className="flex items-center">
            <img src="/logo.png" alt="PricePilot" className="h-[46px] w-auto object-contain" />
          </Link>
        </div>

        {/* Center Pill Menu - Desktop wrapper to ensure exact center */}
        <div className="hidden lg:flex flex-1 justify-center">
          <nav className="flex items-center gap-1 p-1.5 rounded-full border glass-nav" style={{ borderColor: 'var(--pp-border)' }}>
            {navLinks.map((link) => {
              const isAllowed = link.roles.includes(user?.role || '');
              const isActive = pathname === link.href;

              if (!isAllowed) return null;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide text-center transition-all duration-200 ${
                    isActive
                      ? 'nav-active-pill shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-1 lg:flex-initial lg:w-[380px] justify-end">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="theme-toggle scale-90 sm:scale-100"
            title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            aria-label="Toggle theme"
          >
            {/* Inactive knob placeholder */}
            <div className="theme-toggle-placeholder" />

            {/* Clouds under toggle (light mode only) */}
            <div className="toggle-clouds">
              <span className="cloud cloud-1"></span>
              <span className="cloud cloud-2"></span>
              <span className="cloud cloud-3"></span>
            </div>

            {/* Stars next to toggle (dark mode only) */}
            <div className="toggle-stars">
              <span className="star star-1"></span>
              <span className="star star-2"></span>
              <span className="star star-3"></span>
            </div>

            {/* Active knob */}
            <div className="theme-toggle-knob">
              {theme === 'dark' ? (
                <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 text-[#ffffff] fill-current">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#1e1e1e] fill-current">
                  <circle cx="12" cy="12" r="5" />
                  <g>
                    <rect x="11.25" y="2" width="1.5" height="3.5" rx="0.75" />
                    <rect x="11.25" y="18.5" width="1.5" height="3.5" rx="0.75" />
                    <g transform="rotate(45 12 12)">
                      <rect x="11.25" y="2" width="1.5" height="3.5" rx="0.75" />
                      <rect x="11.25" y="18.5" width="1.5" height="3.5" rx="0.75" />
                    </g>
                    <g transform="rotate(90 12 12)">
                      <rect x="11.25" y="2" width="1.5" height="3.5" rx="0.75" />
                      <rect x="11.25" y="18.5" width="1.5" height="3.5" rx="0.75" />
                    </g>
                    <g transform="rotate(135 12 12)">
                      <rect x="11.25" y="2" width="1.5" height="3.5" rx="0.75" />
                      <rect x="11.25" y="18.5" width="1.5" height="3.5" rx="0.75" />
                    </g>
                  </g>
                </svg>
              )}
            </div>
          </button>

          {/* Role Switcher Widget */}
          <div className="relative hidden sm:block" ref={roleSwitcherRef}>
            <button
              onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 rounded-full text-[10px] font-bold tracking-wider uppercase border transition-all cursor-pointer"
              style={{ background: 'var(--pp-accent-muted)', color: 'var(--pp-accent-text)', borderColor: 'var(--pp-border)' }}
            >
              <span className="hidden sm:inline">{user?.role}</span>
              <span className="sm:hidden">{user?.role.substring(0, 3)}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showRoleSwitcher && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 z-50" style={{ border: '1px solid var(--pp-border)', background: 'var(--pp-bg-secondary)', boxShadow: 'var(--pp-shadow)' }}>
                <div className="px-2.5 py-1.5 mb-1" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--pp-text-muted)' }}>Switch Role</span>
                </div>
                {['Admin', 'Pricing Analyst', 'Manager', 'Viewer'].map((role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleSwitch(role)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-semibold transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
                    style={{ color: 'var(--pp-text-secondary)' }}
                  >
                    <span>{role}</span>
                    {user?.role === role && <Check className="w-3.5 h-3.5" style={{ color: 'var(--pp-accent-text)' }} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
              style={{ color: 'var(--pp-text-secondary)' }}
            >
              <Bell className="w-4.5 h-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-[8px] font-extrabold text-white">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl z-50 p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200" style={{ boxShadow: 'var(--pp-shadow)' }}>
                <div className="px-3 py-2 flex justify-between items-center mb-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-white">Alerts ({unreadCount})</span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1.5 p-1 pr-1.5">
                  {notifications.length === 0 ? (
                    <div className="text-center py-6 text-xs" style={{ color: 'var(--pp-text-muted)' }}>
                      No alerts detected
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        onClick={() => handleMarkAsRead(notif.id)}
                        className={`p-2.5 rounded-lg text-left cursor-pointer transition-all border ${
                          notif.isRead 
                            ? 'bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/50 text-slate-400' 
                            : 'bg-white dark:bg-slate-800 border-orange-500/20 hover:border-orange-500/40 text-slate-800 dark:text-slate-200 shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-2 relative group">
                          <span className="mt-0.5">
                            {notif.type === 'competitor' && <AlertCircle className="w-3.5 h-3.5 text-orange-500" />}
                            {notif.type === 'stock' && <Package className="w-3.5 h-3.5 text-yellow-500" />}
                            {notif.type === 'margin' && <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />}
                            {notif.type === 'system' && <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                          </span>
                          <div className="flex-1 min-w-0 pr-5">
                            <p className={`text-xs font-bold leading-normal ${notif.isRead ? 'text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                              {notif.title}
                            </p>
                            <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                              {notif.message}
                            </p>
                          </div>
                          <button
                            onClick={(e) => handleDeleteNotification(notif.id, e)}
                            className="absolute top-0 right-0 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
                            title="Delete alert"
                          >
                            <X className="w-3 h-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Menu Dropdown */}
          <div className="relative" ref={profileMenuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold uppercase transition-all text-xs border cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800"
              style={{ borderColor: 'var(--pp-border)', background: 'var(--pp-bg-tertiary)', color: 'var(--pp-text-secondary)' }}
            >
              {user?.name.substring(0, 2)}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl p-1.5 z-50 shadow-xl animate-in fade-in slide-in-from-top-2 duration-150" style={{ border: '1px solid var(--pp-border)', background: 'var(--pp-bg-secondary)', boxShadow: 'var(--pp-shadow)' }}>
                <div className="px-3 py-2 mb-1" style={{ borderBottom: '1px solid var(--pp-border)' }}>
                  <p className="text-xs font-bold" style={{ color: 'var(--pp-text-primary)' }}>{user?.name}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--pp-text-muted)' }}>{user?.email}</p>
                </div>
                <button
                  onClick={() => {
                    setShowWhatsAppModal(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer mb-1"
                >
                  <svg className="w-3.5 h-3.5 text-emerald-500 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 1.981 14.116.957 11.488.957c-5.43 0-9.85 4.37-9.853 9.8.001 1.956.513 3.864 1.482 5.561l-.979 3.573 3.69-.968zm12.188-7.923c-.332-.165-1.962-.962-2.268-1.073-.306-.113-.53-.167-.752.167-.221.332-.857 1.073-1.05 1.294-.194.22-.387.246-.72.08-.332-.167-1.402-.513-2.671-1.637-1.012-.897-1.696-2.005-1.895-2.338-.2-.332-.021-.512.145-.678.15-.148.332-.384.498-.577.166-.192.222-.328.332-.547.11-.22.055-.411-.027-.577-.083-.165-.752-1.799-1.03-2.47-.27-.65-.547-.563-.752-.574-.195-.01-.418-.011-.641-.011-.222 0-.585.083-.892.417-.306.332-1.17 1.137-1.17 2.77 0 1.634 1.196 3.21 1.362 3.432.166.223 2.353 3.574 5.698 5.004.796.34 1.417.544 1.902.698.8.252 1.528.217 2.103.132.64-.095 1.962-.797 2.238-1.567.277-.77.277-1.432.194-1.567-.083-.135-.306-.217-.638-.382z"/>
                  </svg>
                  Connect WhatsApp
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40" style={{ background: 'var(--pp-backdrop)', backdropFilter: 'blur(4px)' }}>
          <div className="fixed top-0 bottom-0 left-0 w-64 flex flex-col z-50 animate-in slide-in-from-left duration-200" style={{ background: 'var(--pp-bg-secondary)', borderRight: '1px solid var(--pp-border)' }}>
            <div className="h-16 flex items-center justify-between px-6" style={{ borderBottom: '1px solid var(--pp-border)' }}>
              <span className="font-bold text-lg" style={{ color: 'var(--pp-text-heading)' }}>PricePilot</span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                style={{ color: 'var(--pp-text-secondary)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isAllowed = link.roles.includes(user?.role || '');
                const isActive = pathname === link.href;

                if (!isAllowed) return null;

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 space-y-4" style={{ borderTop: '1px solid var(--pp-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold uppercase text-xs" style={{ background: 'var(--pp-bg-tertiary)', border: '1px solid var(--pp-border)', color: 'var(--pp-accent-text)' }}>
                  {user?.name.substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--pp-text-primary)' }}>{user?.name}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--pp-text-muted)' }}>{user?.email}</p>
                </div>
              </div>

              {/* Mobile Role Switcher */}
              <div className="space-y-1 pt-2 border-t border-dashed" style={{ borderColor: 'var(--pp-border)' }}>
                <span className="text-[9px] font-bold uppercase tracking-wider block" style={{ color: 'var(--pp-text-muted)' }}>Active Role</span>
                <select
                  value={user?.role}
                  onChange={(e) => handleRoleSwitch(e.target.value)}
                  className="w-full text-xs font-semibold px-2.5 py-2 rounded-lg border outline-none cursor-pointer"
                  style={{ background: 'var(--pp-bg-tertiary)', color: 'var(--pp-text-secondary)', borderColor: 'var(--pp-border)' }}
                >
                  {['Admin', 'Pricing Analyst', 'Manager', 'Viewer'].map((role) => (
                    <option 
                      key={role} 
                      value={role}
                      className="text-slate-900 dark:text-white bg-white dark:bg-slate-900"
                    >
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Canvas Background & Large Rounded Content Area Wrapper */}
      <main className="flex-grow py-6 px-3 sm:py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl sm:rounded-[32px] p-4 sm:p-8 lg:p-10 shadow-sm min-h-[calc(100vh-12rem)] border theme-transition" style={{ background: 'var(--pp-bg-secondary)', borderColor: 'var(--pp-border)' }}>
            {children}
          </div>
        </div>
      </main>

      {/* WhatsApp Connection Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-800 text-left">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-500 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 1.981 14.116.957 11.488.957c-5.43 0-9.85 4.37-9.853 9.8.001 1.956.513 3.864 1.482 5.561l-.979 3.573 3.69-.968zm12.188-7.923c-.332-.165-1.962-.962-2.268-1.073-.306-.113-.53-.167-.752.167-.221.332-.857 1.073-1.05 1.294-.194.22-.387.246-.72.08-.332-.167-1.402-.513-2.671-1.637-1.012-.897-1.696-2.005-1.895-2.338-.2-.332-.021-.512.145-.678.15-.148.332-.384.498-.577.166-.192.222-.328.332-.547.11-.22.055-.411-.027-.577-.083-.165-.752-1.799-1.03-2.47-.27-.65-.547-.563-.752-.574-.195-.01-.418-.011-.641-.011-.222 0-.585.083-.892.417-.306.332-1.17 1.137-1.17 2.77 0 1.634 1.196 3.21 1.362 3.432.166.223 2.353 3.574 5.698 5.004.796.34 1.417.544 1.902.698.8.252 1.528.217 2.103.132.64-.095 1.962-.797 2.238-1.567.277-.77.277-1.432.194-1.567-.083-.135-.306-.217-.638-.382z"/>
                </svg>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">WhatsApp Connection</h3>
              </div>
              <button 
                onClick={() => setShowWhatsAppModal(false)} 
                className="px-2 py-1 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-4">
              {whatsappInfo.status === 'DISCONNECTED' && (
                <div className="space-y-4 py-2">
                  <div className="w-12 h-12 bg-slate-850 border border-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-600">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.45L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 1.981 14.116.957 11.488.957c-5.43 0-9.85 4.37-9.853 9.8.001 1.956.513 3.864 1.482 5.561l-.979 3.573 3.69-.968zm12.188-7.923c-.332-.165-1.962-.962-2.268-1.073-.306-.113-.53-.167-.752.167-.221.332-.857 1.073-1.05 1.294-.194.22-.387.246-.72.08-.332-.167-1.402-.513-2.671-1.637-1.012-.897-1.696-2.005-1.895-2.338-.2-.332-.021-.512.145-.678.15-.148.332-.384.498-.577.166-.192.222-.328.332-.547.11-.22.055-.411-.027-.577-.083-.165-.752-1.799-1.03-2.47-.27-.65-.547-.563-.752-.574-.195-.01-.418-.011-.641-.011-.222 0-.585.083-.892.417-.306.332-1.17 1.137-1.17 2.77 0 1.634 1.196 3.21 1.362 3.432.166.223 2.353 3.574 5.698 5.004.796.34 1.417.544 1.902.698.8.252 1.528.217 2.103.132.64-.095 1.962-.797 2.238-1.567.277-.77.277-1.432.194-1.567-.083-.135-.306-.217-.638-.382z"/>
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-200">WhatsApp is Disconnected</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Connect your account to send receipts directly to customers.
                    </p>
                  </div>
                  <button
                    onClick={handleConnectWhatsApp}
                    disabled={loadingWhatsapp}
                    className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-[11px] font-bold text-white transition-all shadow-md cursor-pointer"
                  >
                    {loadingWhatsapp ? 'Starting Connection...' : 'Connect WhatsApp'}
                  </button>
                </div>
              )}

              {whatsappInfo.status === 'INITIALIZING' && (
                <div className="space-y-4 py-6">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-200">Initializing Client</p>
                    <p className="text-[10px] text-slate-400">Launching WhatsApp browser session...</p>
                  </div>
                </div>
              )}

              {whatsappInfo.status === 'QR_RECEIVED' && whatsappInfo.qr && (
                <div className="space-y-4 py-2">
                  <p className="text-[11px] font-bold text-slate-300">Scan QR Code with WhatsApp</p>
                  <div className="bg-white p-3 rounded-xl inline-block shadow-md">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(whatsappInfo.qr)}&size=160x160`} 
                      alt="WhatsApp QR Code"
                      className="w-40 h-40 mx-auto" 
                    />
                  </div>
                  <div className="space-y-1 text-[10px] text-slate-400 max-w-xs mx-auto leading-normal text-left px-4">
                    <p>• Open WhatsApp on your phone</p>
                    <p>• Go to Settings / Linked Devices</p>
                    <p>• Tap "Link a Device" and scan code</p>
                  </div>
                </div>
              )}

              {whatsappInfo.status === 'CONNECTED' && (
                <div className="space-y-4 py-2">
                  <div className="w-12 h-12 bg-emerald-950/40 border border-emerald-900 rounded-full flex items-center justify-center mx-auto text-emerald-400">
                    <Check className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-200">WhatsApp Connected</p>
                    <p className="text-[10px] text-emerald-400">Successfully linked! Automatic receipts are active.</p>
                  </div>
                  <button
                    onClick={handleDisconnectWhatsApp}
                    disabled={loadingWhatsapp}
                    className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-[11px] font-bold text-white transition-all shadow-md cursor-pointer"
                  >
                    {loadingWhatsapp ? 'Disconnecting...' : 'Disconnect WhatsApp'}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
