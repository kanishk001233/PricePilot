'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Calendar, 
  User, 
  Phone, 
  CheckCircle,
  FileText,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  RotateCcw
} from 'lucide-react';

export default function SalesPage() {
  const [salesLogs, setSalesLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [returningId, setReturningId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [loadedPages, setLoadedPages] = useState<number[]>([1]);
  const [pageTransitionLoading, setPageTransitionLoading] = useState(false);
  const pageSize = 10;

  const fetchSalesLogs = async () => {
    try {
      const res = await fetch('/api/products/sales');
      if (res.ok) {
        const logsData = await res.json();
        setSalesLogs(logsData);
      }
    } catch (err) {
      console.error('Error fetching sales history logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesLogs();
  }, []);

  const handleReturn = async (transactionId: string) => {
    if (!confirm('Are you sure you want to return this product? This will restore the quantity back to catalog inventory.')) {
      return;
    }
    setReturningId(transactionId);
    try {
      const res = await fetch('/api/products/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId })
      });
      if (res.ok) {
        alert('Product returned successfully! Inventory has been updated.');
        await fetchSalesLogs();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Error returning product:', err);
      alert('Failed to return product.');
    } finally {
      setReturningId(null);
    }
  };

  // Filter local sales logs
  const filteredSales = salesLogs.filter((log) => {
    const term = searchQuery.toLowerCase();
    const customer = log.customerName || '';
    const email = log.customerEmail || '';
    const sku = log.productSku || '';
    const name = log.productName || '';
    const cashier = log.cashierEmail || '';
    return name.toLowerCase().includes(term) || 
           sku.toLowerCase().includes(term) || 
           customer.toLowerCase().includes(term) ||
           email.toLowerCase().includes(term) ||
           cashier.toLowerCase().includes(term);
  });

  // Reset to page 1 on search filter change
  useEffect(() => {
    setCurrentPage(1);
    setLoadedPages([1]);
  }, [searchQuery]);

  // Calculate gross sales metrics (excluding returned items)
  const totalSalesCount = salesLogs.filter(s => !s.returned).length;
  const totalRevenueGenerated = salesLogs.reduce((sum, log) => log.returned ? sum : sum + log.revenue, 0);

  // Pagination calculation
  const totalPages = Math.ceil(filteredSales.length / pageSize) || 1;

  // Background preload next page
  useEffect(() => {
    const nextPage = currentPage + 1;
    if (nextPage <= totalPages && !loadedPages.includes(nextPage)) {
      const timer = setTimeout(() => {
        setLoadedPages((prev) => [...prev, nextPage]);
      }, 500); // 500ms background prefetch simulation
      return () => clearTimeout(timer);
    }
  }, [currentPage, totalPages, loadedPages]);

  const handlePageChange = (newPage: number) => {
    if (loadedPages.includes(newPage)) {
      setCurrentPage(newPage);
    } else {
      setPageTransitionLoading(true);
      setTimeout(() => {
        setLoadedPages((prev) => [...prev, newPage]);
        setCurrentPage(newPage);
        setPageTransitionLoading(false);
      }, 350); // 350ms loading UI fallback
    }
  };

  const paginatedSales = filteredSales.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Sales History</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track POS register checkouts, customers metrics, and real-time revenue stats.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Total Sales Count</span>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mt-0.5">{totalSalesCount} Orders</h3>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Gross POS Revenue</span>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mt-0.5">₹{totalRevenueGenerated.toFixed(2)}</h3>
          </div>
        </div>
      </div>

      {/* Main logs container */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-left">
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Transactions Feed</h3>
            <p className="text-slate-500 text-xs mt-0.5">Audit log of sales checkouts processed through registers.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by customer, SKU or cashier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-lg pl-9 pr-4 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-605 focus:outline-none transition-all"
            />
          </div>
        </div>

        {loading || pageTransitionLoading ? (
          <div className="space-y-4 py-8 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-slate-800/40">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-800/60 rounded w-2/3"></div>
                  <div className="h-3 bg-slate-800/40 rounded w-1/3"></div>
                </div>
                <div className="h-12 bg-slate-800/50 rounded w-48 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs border border-dashed border-slate-800/80 rounded-xl">
            No sales transactions logged.
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-800/80">
              {paginatedSales.map((log) => {
                const isReturned = !!log.returned;
                const transactionDate = new Date(log.transactionDate);
                const diffDays = (new Date().getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24);
                const canReturn = diffDays <= 3 && !isReturned;

                return (
                  <div 
                    key={log.id} 
                    className={`py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0 transition-all ${
                      isReturned ? 'opacity-65 bg-slate-950/20 rounded-lg px-2.5 my-1 border border-dashed border-slate-800/40' : ''
                    }`}
                  >
                    <div className="space-y-1.5 text-left flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-semibold ${isReturned ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                          Sold {log.quantity} units of SKU {log.productSku} ({log.productName}) for ₹{log.revenue.toFixed(2)}.
                        </span>
                        {isReturned && (
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wide uppercase bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30">
                            Returned
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {transactionDate.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          Cashier: {log.cashierEmail}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      {/* Customer Details */}
                      <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 min-w-[200px] text-left space-y-1">
                        <span className="text-[9px] text-slate-400 font-bold block tracking-wider uppercase">Customer Detail</span>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{log.customerName}</p>
                        <p className="text-[10px] text-slate-400">Phone: {log.customerPhone}</p>
                        <p className="text-[10px] text-slate-400">Gmail: {log.customerEmail}</p>
                      </div>

                      {/* Actions (Return Button) */}
                      <div className="self-center">
                        <button
                          disabled={!canReturn || returningId === log.id}
                          onClick={() => handleReturn(log.id)}
                          className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                            isReturned
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-transparent cursor-not-allowed'
                              : !canReturn
                                ? 'bg-slate-100 dark:bg-slate-850/40 text-slate-400 dark:text-slate-600 border-transparent cursor-not-allowed'
                                : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/30 active:scale-95 shadow-sm'
                          }`}
                          title={isReturned ? "Already returned" : !canReturn ? "Returned or exceeds 3 days return policy" : "Process product return"}
                        >
                          <RotateCcw className={`w-3.5 h-3.5 ${returningId === log.id ? 'animate-spin' : ''}`} />
                          <span>{isReturned ? 'Returned' : 'Return Item'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-4 mt-4">
                <span className="text-xs text-slate-400">
                  Page {currentPage} of {totalPages} ({filteredSales.length} total)
                </span>
                <div className="flex items-center gap-1 text-slate-600">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        page === currentPage
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}
