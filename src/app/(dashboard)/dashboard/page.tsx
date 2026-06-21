'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  DollarSign, 
  TrendingUp, 
  Percent, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  ShieldAlert, 
  Layers, 
  Scale, 
  ChevronRight,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell
} from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string>('');
  
  // Collapsible panels states (collapsed by default)
  const [showPriceGaps, setShowPriceGaps] = useState(false);
  const [showAnomalies, setShowAnomalies] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/dashboard/summary');
        if (res.ok) {
          const summaryData = await res.json();
          setData(summaryData);
        } else {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error || 'Failed to fetch dashboard metrics.');
        }
      } catch (err: any) {
        console.error('Error fetching dashboard summary:', err);
        setError('Network connection error. Please verify server status.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading || !mounted) {
    return (
      <div className="space-y-6">
        {/* Title skeleton */}
        <div className="h-8 w-48 bg-slate-800 rounded animate-pulse"></div>
        
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse"></div>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 h-80 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"></div>
          <div className="lg:col-span-4 h-80 bg-slate-900 border border-slate-800 rounded-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Executive Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">Performance metrics and dynamic price optimization indicators.</p>
          </div>
        </div>

        <div className="p-8 rounded-2xl border border-rose-900/40 bg-rose-950/20 text-center max-w-2xl mx-auto my-12 space-y-4 shadow-xl">
          <ShieldAlert className="w-16 h-16 text-rose-500 mx-auto animate-pulse" />
          <h3 className="text-lg font-bold text-white">Database Connection Failure</h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            {error}
          </p>
          <p className="text-slate-500 text-xs leading-normal pt-2 border-t border-slate-900">
            Please verify your `.env.local` keys. To configure the production database, ensure that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are provided and match your Supabase project credentials.
          </p>
        </div>
      </div>
    );
  }

  const summary = data?.summary || { totalRevenue: 0, averageMarginPercent: 0, totalUnitsSold: 0, lowInventoryCount: 0, pendingRecommendationsCount: 0 };
  const forecast = data?.forecast || { projectedRevenue: 0, projectedMarginPercent: 0, projectedProfit: 0 };
  const salesTrend = data?.salesTrend || [];
  const competitorGaps = data?.competitorGaps || [];
  const categoryMargins = data?.categoryMargins || [];
  const highRiskItems = data?.highRiskItems || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Executive Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">Performance metrics and dynamic price optimization indicators.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-300">Active Intelligence Engine</span>
        </div>
      </div>

      {/* Database connection banner */}
      <div className="p-4 rounded-xl border border-indigo-900/30 bg-indigo-950/20 flex gap-3 text-left">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="text-xs font-bold text-slate-200">Connected to Supabase PostgreSQL Database</span>
          <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
            Real-time optimization engine is fully synced with your live Supabase project. Prices, snapshots, rules, and sales transactions are fetched directly from your cloud tables.
          </p>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card: Revenue */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/60 transition-all flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">30D Revenue</span>
            <div className="p-1.5 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-900/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-white">₹{(summary.totalRevenue ?? 0).toLocaleString()}</h3>
            <div className="flex items-center gap-1 mt-1 text-emerald-400 text-xs font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+4.2% vs previous period</span>
            </div>
          </div>
        </div>

        {/* Card: Margin */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/60 transition-all flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Avg Profit Margin</span>
            <div className="p-1.5 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-900/30">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-white">{summary.averageMarginPercent ?? 0}%</h3>
            <div className="flex items-center gap-1 mt-1 text-slate-400 text-xs font-medium">
              <span>Target Floor Margin: 30%</span>
            </div>
          </div>
        </div>

        {/* Card: Forecast Projected Revenue */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/60 transition-all flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Projected 30D Revenue</span>
            <div className="p-1.5 rounded-lg bg-violet-950/60 text-violet-400 border border-violet-900/30">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-white">₹{(forecast.projectedRevenue ?? 0).toLocaleString()}</h3>
            <div className="flex items-center gap-1 mt-1 text-indigo-400 text-xs font-medium">
              <span>Projected Margin: {forecast.projectedMarginPercent ?? 0}%</span>
            </div>
          </div>
        </div>

        {/* Card: Recommendations Pending */}
        <Link href="/recommendations" className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 hover:border-indigo-500/30 transition-all flex flex-col justify-between shadow-lg cursor-pointer group">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">Pending Recommendations</span>
            <div className="p-1.5 rounded-lg bg-orange-950/60 text-orange-400 border border-orange-900/30 group-hover:border-orange-500/30 transition-all">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <h3 className="text-2xl font-black text-white">{summary.pendingRecommendationsCount ?? 0}</h3>
            <div className="flex items-center gap-1 mt-1 text-indigo-400 text-xs font-medium">
              <span>Workflow approvals pending</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </Link>

      </div>

      {/* Charts Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sales Trend Chart */}
        <div className="lg:col-span-8 bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-white">Daily Sales & Transactions Volume</h3>
              <p className="text-slate-500 text-xs mt-0.5">Historical daily revenue and unit velocity tracking.</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  tickFormatter={(v) => v.substring(5)}
                />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                  formatter={(value) => [`₹${Number(value).toFixed(2)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Margin bar chart */}
        <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-lg flex flex-col justify-between">
          <div className="mb-6">
            <h3 className="text-base font-bold text-white">Profit Margin by Category</h3>
            <p className="text-slate-500 text-xs mt-0.5">Average profit margins across active departments.</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {categoryMargins.length === 0 ? (
              <span className="text-slate-500 text-xs">No catalog margin transactions logged</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryMargins} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} width={80} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff', fontSize: '11px' }}
                    formatter={(value) => [`${value}%`, 'Average Margin']}
                  />
                  <Bar dataKey="margin" radius={[0, 4, 4, 0]} barSize={12}>
                    {categoryMargins.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.margin > 40 ? '#10b981' : entry.margin > 25 ? '#3b82f6' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Competitor Price Gaps Panel */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-lg">
        <button 
          onClick={() => setShowPriceGaps(!showPriceGaps)}
          className="w-full flex items-center justify-between text-left focus:outline-none cursor-pointer"
        >
          <div>
            <h3 className="text-base font-bold text-white">Competitor Price Deficits (Price Gaps)</h3>
            <p className="text-slate-500 text-xs mt-0.5">Variance of our selling price against latest competitor averages.</p>
          </div>
          <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
            {showPriceGaps ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showPriceGaps && (
          <div className="mt-6 pt-6 border-t border-slate-800/60 animate-in fade-in duration-200">
            {competitorGaps.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No competitor pricing benchmarks available. Try Syncing Market in top bar.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {competitorGaps.map((item: any, idx: number) => {
                  const isUnderpriced = item.gapPercent < -10;
                  const isOverpriced = item.gapPercent > 10;
                  
                  return (
                    <div key={idx} className="p-4 rounded-xl border border-slate-800/60 bg-slate-950/20 space-y-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-500 font-bold block">{item.sku}</span>
                          <span className="text-xs font-semibold text-slate-200 truncate block">{item.name}</span>
                        </div>
                        
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          isUnderpriced 
                            ? 'bg-rose-950/40 border-rose-800/30 text-rose-400' 
                            : isOverpriced 
                              ? 'bg-amber-950/40 border-amber-800/30 text-amber-400' 
                              : 'bg-emerald-950/40 border-emerald-800/30 text-emerald-400'
                        }`}>
                          {item.gapPercent > 0 ? `+${item.gapPercent}%` : `${item.gapPercent}%`} vs Comp
                        </span>
                      </div>

                      <div className="flex justify-between text-xs pt-1 border-t border-slate-900">
                        <div>
                          <span className="text-slate-500 text-[10px]">OUR PRICE</span>
                          <p className="font-bold text-slate-200">₹{(item.ourPrice ?? 0).toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 text-[10px]">COMP AVERAGE</span>
                          <p className="font-bold text-slate-200">₹{(item.competitorAverage ?? 0).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* High Risk Items List */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button 
            onClick={() => setShowAnomalies(!showAnomalies)}
            className="flex-1 flex items-center justify-between text-left focus:outline-none cursor-pointer"
          >
            <div>
              <h3 className="text-base font-bold text-white">Anomalies & Margin-Risk Products</h3>
              <p className="text-slate-500 text-xs mt-0.5">SKUs breaking margins thresholds or priced too far outside market corridors.</p>
            </div>
            <div className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400">
              {showAnomalies ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>
        </div>

        {showAnomalies && (
          <div className="mt-6 pt-6 border-t border-slate-800/60 animate-in fade-in duration-200">
            {highRiskItems.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                No active margin risks or price anomalies found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="pb-3 font-semibold">SKU / Product</th>
                      <th className="pb-3 font-semibold">Issue</th>
                      <th className="pb-3 font-semibold">Details</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {highRiskItems.map((item: any) => (
                      <tr key={`${item.id}-${item.issue}`} className="hover:bg-slate-900/10 transition-colors">
                        <td className="py-3.5">
                          <span className="text-slate-500 font-bold block text-[10px]">{item.sku}</span>
                          <span className="font-medium text-slate-200">{item.name}</span>
                        </td>
                        <td className="py-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[9px] ${
                            item.severity === 'high' 
                              ? 'bg-rose-950/40 text-rose-400 border border-rose-900/20' 
                              : 'bg-amber-950/40 text-amber-400 border border-amber-900/20'
                          }`}>
                            <ShieldAlert className="w-2.5 h-2.5" />
                            {item.issue}
                          </span>
                        </td>
                        <td className="py-3.5 text-slate-400">{item.details}</td>
                        <td className="py-3.5 text-right">
                          <Link 
                            href="/recommendations"
                            className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/30 hover:bg-slate-900 text-indigo-400 text-xs font-semibold transition-all"
                          >
                            Optimize
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
