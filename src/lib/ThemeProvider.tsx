'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  dashboardData: any;
  loadingDashboard: boolean;
  dashboardError: string;
  preloadDashboard: () => void;
  productsData: any[];
  loadingProducts: boolean;
  productsError: string;
  preloadProducts: () => Promise<void>;
  categoriesData: any[];
  loadingCategories: boolean;
  categoriesError: string;
  preloadCategories: () => Promise<void>;
  competitorsData: any;
  loadingCompetitors: boolean;
  competitorsError: string;
  preloadCompetitors: () => Promise<void>;
  recommendationsData: any[];
  loadingRecommendations: boolean;
  recommendationsError: string;
  preloadRecommendations: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  dashboardData: null,
  loadingDashboard: true,
  dashboardError: '',
  preloadDashboard: () => {},
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
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

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

  const [competitorsData, setCompetitorsData] = useState<any[]>([]);
  const [loadingCompetitors, setLoadingCompetitors] = useState<boolean>(true);
  const [competitorsError, setCompetitorsError] = useState<string>('');

  const [recommendationsData, setRecommendationsData] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState<boolean>(true);
  const [recommendationsError, setRecommendationsError] = useState<string>('');

  const preloadDashboard = async () => {
    try {
      setLoadingDashboard(true);
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

  const preloadProducts = async () => {
    try {
      setLoadingProducts(true);
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

  const preloadCategories = async () => {
    try {
      setLoadingCategories(true);
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

  const preloadCompetitors = async () => {
    try {
      setLoadingCompetitors(true);
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

  const preloadRecommendations = async () => {
    try {
      setLoadingRecommendations(true);
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
      // Trigger all prefetching operations in parallel
      preloadDashboard();
      preloadProducts();
      preloadCategories();
      preloadCompetitors();
      preloadRecommendations();
    }
  }, [mounted]);

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
      preloadRecommendations
    }}>
      {children}
    </ThemeContext.Provider>
  );
}
