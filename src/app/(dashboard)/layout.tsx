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
  
  const [user, setUser] = useState<{ email: string; role: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const roleSwitcherRef = useRef<HTMLDivElement>(null);

  // Fetch session & notifications
  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Error fetching session:', err);
    } finally {
      setLoading(false);
    }
  };

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
    fetchSession();
    fetchNotifications();

    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const handleSyncCompetitors = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/competitor-prices/sync', { method: 'POST' });
      if (res.ok) {
        await fetchNotifications();
        // Log synced successfully
        alert('Competitor intelligence sync completed! New pricing snapshots generated.');
      } else {
        const data = await res.json();
        alert(`Sync failed: ${data.error}`);
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
          {/* Sync Trigger */}
          {['Admin', 'Pricing Analyst'].includes(user?.role || '') && (
            <button
              onClick={handleSyncCompetitors}
              disabled={syncing}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer disabled:opacity-50"
              style={{ borderColor: 'var(--pp-border)', background: 'var(--pp-bg-secondary)', color: 'var(--pp-text-secondary)' }}
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          )}

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
          <div className="relative" ref={roleSwitcherRef}>
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
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5">
                            {notif.type === 'competitor' && <AlertCircle className="w-3.5 h-3.5 text-orange-500" />}
                            {notif.type === 'stock' && <Package className="w-3.5 h-3.5 text-yellow-500" />}
                            {notif.type === 'margin' && <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />}
                            {notif.type === 'system' && <Sliders className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold leading-normal ${notif.isRead ? 'text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                              {notif.title}
                            </p>
                            <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                              {notif.message}
                            </p>
                          </div>
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
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4" style={{ borderTop: '1px solid var(--pp-border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold uppercase text-xs" style={{ background: 'var(--pp-bg-tertiary)', border: '1px solid var(--pp-border)', color: 'var(--pp-accent-text)' }}>
                  {user?.name.substring(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--pp-text-primary)' }}>{user?.name}</p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--pp-text-muted)' }}>{user?.email}</p>
                </div>
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
    </div>
  );
}
