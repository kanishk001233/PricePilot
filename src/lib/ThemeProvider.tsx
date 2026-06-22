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
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
