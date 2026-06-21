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
  DollarSign
} from 'lucide-react';

export default function SalesPage() {
  const [salesLogs, setSalesLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter local sales logs
  const filteredSales = salesLogs.filter((log) => {
    const term = searchQuery.toLowerCase();
    return log.productName.toLowerCase().includes(term) || 
           log.productSku.toLowerCase().includes(term) || 
           log.customerName.toLowerCase().includes(term) ||
           log.cashierEmail.toLowerCase().includes(term);
  });

  // Calculate gross sales metrics
  const totalSalesCount = salesLogs.length;
  const totalRevenueGenerated = salesLogs.reduce((sum, log) => sum + log.revenue, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Sales History</h1>
          <p className="text-slate-400 text-sm mt-0.5">Track POS register checkouts, customers metrics, and real-time revenue stats.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-900/30">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Total Sales Count</span>
            <h3 className="text-xl font-black text-white mt-0.5">{totalSalesCount} Orders</h3>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 flex items-center gap-4 shadow-lg">
          <div className="p-3 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-900/30">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block tracking-wider">Gross POS Revenue</span>
            <h3 className="text-xl font-black text-white mt-0.5">₹{totalRevenueGenerated.toFixed(2)}</h3>
          </div>
        </div>
      </div>

      {/* Main logs container */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white">Transactions Feed</h3>
            <p className="text-slate-500 text-xs mt-0.5">Audit log of sales checkouts processed through registers.</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by customer, SKU or cashier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-lg pl-9 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">Loading sales logs...</div>
        ) : filteredSales.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs border border-dashed border-slate-850 rounded-xl">
            No sales transactions logged.
          </div>
        ) : (
          <div className="divide-y divide-slate-850">
            {filteredSales.map((log) => (
              <div key={log.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div className="space-y-1.5 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-200">
                      Sold {log.quantity} units of SKU {log.productSku} ({log.productName}) for ₹{log.revenue.toFixed(2)}.
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(log.transactionDate).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5" />
                      Cashier: {log.cashierEmail}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-850/60 min-w-[200px] text-left space-y-1 sm:text-right sm:self-start">
                  <span className="text-[9px] text-slate-500 font-bold block tracking-wider uppercase">Customer Detail</span>
                  <p className="text-xs font-bold text-slate-300">{log.customerName}</p>
                  <p className="text-[10px] text-slate-500">Phone: {log.customerPhone}</p>
                  <p className="text-[10px] text-slate-500">Gmail: {log.customerEmail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
