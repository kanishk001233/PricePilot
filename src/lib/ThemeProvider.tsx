'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  user: { email: string; role: string; name: string } | null;
  loadingUser: boolean;
  preloadUserSession: () => Promise<void>;
  dashboardData: any;
  loadingDashboard: boolean;
  dashboardError: string;
  preloadDashboard: (silent?: boolean) => Promise<void>;
  productsData: any[];
  loadingProducts: boolean;
  productsError: string;
  preloadProducts: (silent?: boolean) => Promise<void>;
  categoriesData: any[];
  loadingCategories: boolean;
  categoriesError: string;
  preloadCategories: (silent?: boolean) => Promise<void>;
  competitorsData: any;
  loadingCompetitors: boolean;
  competitorsError: string;
  preloadCompetitors: (silent?: boolean) => Promise<void>;
  recommendationsData: any[];
  loadingRecommendations: boolean;
  recommendationsError: string;
  preloadRecommendations: (silent?: boolean) => Promise<void>;
  salesData: any[];
  loadingSales: boolean;
  salesError: string;
  preloadSales: (silent?: boolean) => Promise<void>;
  userRole: string;
  userEmail: string;
  showAlert: (title: string, message: string, type?: 'success' | 'error' | 'info') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  user: null,
  loadingUser: true,
  preloadUserSession: async () => {},
  dashboardData: null,
  loadingDashboard: true,
  dashboardError: '',
  preloadDashboard: async () => {},
  productsData: [],
  loadingProducts: true,
  productsError: '',
  preloadProducts: async () => {},
  categoriesData: [],
  loadingCategories: true,
  categoriesError: '',
  preloadCategories: async () => {},
  competitorsData: null,
  loadingCompetitors: true,
  competitorsError: '',
  preloadCompetitors: async () => {},
  recommendationsData: [],
  loadingRecommendations: true,
  recommendationsError: '',
  preloadRecommendations: async () => {},
  salesData: [],
  loadingSales: true,
  salesError: '',
  preloadSales: async () => {},
  userRole: 'Viewer',
  userEmail: '',
  showAlert: () => {},
  showConfirm: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  // Global Session State
  const [user, setUser] = useState<{ email: string; role: string; name: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState<boolean>(true);

  // Prefetch States
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loadingDashboard, setLoadingDashboard] = useState<boolean>(true);
  const [dashboardError, setDashboardError] = useState<string>('');

  const [productsData, setProductsData] = useState<any[]>([]);
  
  // Custom dialog systems
  const [alertDialog, setAlertDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setAlertDialog({ show: true, title, message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ show: true, title, message, onConfirm });
  };
  const [loadingProducts, setLoadingProducts] = useState<boolean>(true);
  const [productsError, setProductsError] = useState<string>('');

  const [categoriesData, setCategoriesData] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [categoriesError, setCategoriesError] = useState<string>('');

  const [competitorsData, setCompetitorsData] = useState<any>(null);
  const [loadingCompetitors, setLoadingCompetitors] = useState<boolean>(true);
  const [competitorsError, setCompetitorsError] = useState<string>('');

  const [recommendationsData, setRecommendationsData] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState<boolean>(true);
  const [recommendationsError, setRecommendationsError] = useState<string>('');

  const [salesData, setSalesData] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState<boolean>(true);
  const [salesError, setSalesError] = useState<string>('');

  const preloadUserSession = async () => {
    try {
      setLoadingUser(true);
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.authenticated) {
          setUser(meData.user);
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error prefetching user session:', err);
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  const preloadDashboard = async (silent = false) => {
    try {
      if (!silent) setLoadingDashboard(true);
      const res = await fetch('/api/dashboard/summary');
      if (res.ok) {
        const summaryData = await res.json();
        setDashboardData(summaryData);
      } else {
        const errData = await res.json().catch(() => ({}));
        setDashboardError(errData.error || 'Failed to fetch dashboard metrics.');
      }
    } catch (err: any) {
      console.error('Error prefetching dashboard summary:', err);
      setDashboardError('Network connection error. Please verify server status.');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const preloadProducts = async (silent = false) => {
    try {
      if (!silent) setLoadingProducts(true);
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProductsData(data);
      } else {
        setProductsError('Failed to fetch product catalog.');
      }
    } catch (err) {
      console.error('Error prefetching products:', err);
      setProductsError('Network connection error.');
    } finally {
      setLoadingProducts(false);
    }
  };

  const preloadCategories = async (silent = false) => {
    try {
      if (!silent) setLoadingCategories(true);
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategoriesData(data);
      } else {
        setCategoriesError('Failed to fetch categories.');
      }
    } catch (err) {
      console.error('Error prefetching categories:', err);
      setCategoriesError('Network connection error.');
    } finally {
      setLoadingCategories(false);
    }
  };

  const preloadCompetitors = async (silent = false) => {
    try {
      if (!silent) setLoadingCompetitors(true);
      const res = await fetch('/api/competitors');
      if (res.ok) {
        const data = await res.json();
        setCompetitorsData(data);
      } else {
        setCompetitorsError('Failed to fetch competitors list.');
      }
    } catch (err) {
      console.error('Error prefetching competitors:', err);
      setCompetitorsError('Network connection error.');
    } finally {
      setLoadingCompetitors(false);
    }
  };

  const preloadRecommendations = async (silent = false) => {
    try {
      if (!silent) setLoadingRecommendations(true);
      const res = await fetch('/api/pricing/recommend');
      if (res.ok) {
        const data = await res.json();
        setRecommendationsData(data);
      } else {
        setRecommendationsError('Failed to fetch pricing recommendations.');
      }
    } catch (err) {
      console.error('Error prefetching recommendations:', err);
      setRecommendationsError('Network connection error.');
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const preloadSales = async (silent = false) => {
    try {
      if (!silent) setLoadingSales(true);
      const res = await fetch('/api/products/sales');
      if (res.ok) {
        const data = await res.json();
        setSalesData(data);
      } else {
        setSalesError('Failed to fetch sales logs.');
      }
    } catch (err) {
      console.error('Error prefetching sales:', err);
      setSalesError('Network connection error.');
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('pricepilot-theme') as Theme | null;
    if (stored === 'light' || stored === 'dark') {
      setTheme(stored);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('pricepilot-theme', theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (mounted) {
      preloadUserSession();
    }
  }, [mounted]);

  // Load all dashboard/app data immediately in the background once the user is logged in
  useEffect(() => {
    if (user) {
      preloadDashboard(true);
      preloadProducts(true);
      preloadCategories(true);
      preloadCompetitors(true);
      preloadRecommendations(true);
      preloadSales(true);
    }
  }, [user]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme, 
      user,
      loadingUser,
      preloadUserSession,
      dashboardData, 
      loadingDashboard, 
      dashboardError, 
      preloadDashboard,
      productsData,
      loadingProducts,
      productsError,
      preloadProducts,
      categoriesData,
      loadingCategories,
      categoriesError,
      preloadCategories,
      competitorsData,
      loadingCompetitors,
      competitorsError,
      preloadCompetitors,
      recommendationsData,
      loadingRecommendations,
      recommendationsError,
      preloadRecommendations,
      salesData,
      loadingSales,
      salesError,
      preloadSales,
      userRole: user?.role || 'Viewer',
      userEmail: user?.email || '',
      showAlert,
      showConfirm,
    }}>
      {children}

      {/* Custom Alert Modal */}
      {alertDialog && alertDialog.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${
                alertDialog.type === 'success' 
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' 
                  : alertDialog.type === 'error'
                    ? 'bg-rose-950/40 text-rose-400 border-rose-900/30'
                    : 'bg-indigo-950/40 text-indigo-400 border-indigo-900/30'
              }`}>
                {alertDialog.type === 'success' ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : alertDialog.type === 'error' ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <h3 className="text-base font-bold text-white">{alertDialog.title}</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">{alertDialog.message}</p>
            <button
              onClick={() => setAlertDialog(null)}
              className="mt-2 w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-black hover:text-white transition-all shadow-md cursor-pointer"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmDialog && confirmDialog.show && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-950/40 text-rose-400 border-rose-900/30">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white">{confirmDialog.title}</h3>
            </div>
            <p className="text-xs text-slate-350 leading-relaxed font-medium">{confirmDialog.message}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 h-10 rounded-xl border border-slate-850 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const onConf = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  onConf();
                }}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ThemeContext.Provider>
  );
}
