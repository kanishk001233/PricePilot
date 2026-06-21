'use client';

import React, { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  RefreshCw, 
  ExternalLink, 
  TrendingDown, 
  TrendingUp, 
  Plus, 
  X, 
  AlertTriangle,
  Globe,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  Search,
  Trash
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';

import { useTheme } from '@/lib/ThemeProvider';
type CompetitorProduct = {
  id: string;
  name?: string;
  price?: number;
};
export default function CompetitorsPage() {
  const { 
    competitorsData, 
    loadingCompetitors, 
    preloadCompetitors,
    productsData,
    loadingProducts,
    preloadProducts
  } = useTheme();

  const competitors = competitorsData?.competitors || [];
  const competitorProducts: CompetitorProduct[] =
    competitorsData?.competitorProducts || [];
  const products = productsData;
  const loading = loadingCompetitors || loadingProducts;

  const [syncing, setSyncing] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [userRole, setUserRole] = useState<string>('Viewer');
  const [syncingProductId, setSyncingProductId] = useState<string | null>(null);
  const [activeSyncs, setActiveSyncs] = useState<string[]>([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [loadedPages, setLoadedPages] = useState<number[]>([1]);
  const [pageTransitionLoading, setPageTransitionLoading] = useState(false);
  const pageSize = 8;

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHistoryFeedId, setSelectedHistoryFeedId] = useState<string | null>(null);
  const selectedHistoryFeed = React.useMemo(() => {
    if (!selectedHistoryFeedId) return null;
    return competitorProducts.find(cp => cp.id === selectedHistoryFeedId) || null;
  }, [selectedHistoryFeedId, competitorProducts]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedCompetitorId, setSelectedCompetitorId] = useState('');
  const [competitorSku, setCompetitorSku] = useState('');
  const [url, setUrl] = useState('');
  const [expandedProductIds, setExpandedProductIds] = useState<string[]>([]);

  // Chart domain helpers
  const getXAxisDomain = ([dataMin, dataMax]: any): any => {
    if (dataMin === dataMax) {
      const oneHour = 60 * 60 * 1000;
      return [dataMin - oneHour, dataMax + oneHour];
    }
    return [dataMin, dataMax];
  };

  const getYAxisDomain = ([dataMin, dataMax]: any): any => {
    if (dataMin === dataMax) {
      const margin = dataMin * 0.05 || 10;
      return [dataMin - margin, dataMax + margin];
    }
    const diff = dataMax - dataMin;
    const padding = diff * 0.1;
    return [dataMin - padding, dataMax + padding];
  };

  const toggleExpandProduct = (productId: string) => {
    setExpandedProductIds(prev => 
      prev.includes(productId) ? [] : [productId]
    );
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriceValue, setEditPriceValue] = useState<string>('');

  const handleSavePriceOverride = async (competitorProductId: string) => {
    if (!editPriceValue || isNaN(Number(editPriceValue))) return;
    try {
      const res = await fetch('/api/competitor-prices/override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          competitorProductId,
          price: Number(editPriceValue)
        })
      });
      if (res.ok) {
        setEditingId(null);
        setEditPriceValue('');
        fetchData();
      } else {
        const data = await res.json();
        alert(`Override failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Price override error:', err);
      alert('An error occurred while saving the price override.');
    }
  };


  const groupedProducts = React.useMemo(() => {
    return products.map(prod => {
      const feeds = competitorProducts.filter(cp => cp.productId === prod.id);
      return {
        productId: prod.id,
        productSku: prod.sku,
        productName: prod.name,
        ourCurrentPrice: prod.currentPrice,
        competitors: feeds
      };
    });
  }, [products, competitorProducts]);

  const totalPages = Math.ceil(groupedProducts.length / pageSize) || 1;

  // Background preload next page
  React.useEffect(() => {
    const nextPage = currentPage + 1;
    if (nextPage <= totalPages && !loadedPages.includes(nextPage)) {
      const timer = setTimeout(() => {
        setLoadedPages((prev) => [...prev, nextPage]);
      }, 500);
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
      }, 350);
    }
  };

  const paginatedGroupedProducts = React.useMemo(() => {
    return groupedProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [groupedProducts, currentPage]);

  const fetchData = async () => {
    try {
      // Fetch session
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setUserRole(meData.user.role);
      }
      await Promise.all([preloadProducts(), preloadCompetitors()]);
    } catch (err) {
      console.error('Error fetching competitors:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  useEffect(() => {
    if (competitors.length > 0 && !selectedCompetitorId) {
      setSelectedCompetitorId(competitors[0].id);
    }
  }, [competitors, selectedCompetitorId]);

  useEffect(() => {
    if (competitorsData?.activeSyncs) {
      setActiveSyncs(competitorsData.activeSyncs);
    }
  }, [competitorsData]);

  useEffect(() => {
    if (activeSyncs.length > 0) {
      const interval = setInterval(() => {
        fetchData();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeSyncs]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/competitor-prices/sync', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`Sync success! Scanned ${data.scannedCount} items, generated ${data.snapshotsCreated} pricing logs, triggered ${data.alertsTriggered} alerts.`);
        fetchData();
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

  const handleSingleSync = async (productId: string) => {
    if (syncingProductId !== null) return;
    setSyncingProductId(productId);
    try {
      const res = await fetch('/api/competitor-prices/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });
      if (res.ok) {
        await fetchData();
      } else {
        const data = await res.json();
        alert(`Sync Error: ${data.error || 'Failed to sync product prices'}`);
      }
    } catch (err) {
      console.error('Error syncing product competitor prices:', err);
    } finally {
      setSyncingProductId(null);
    }
  };

  const handleDeleteFeed = async (feedId: string) => {
    if (confirm("Are you sure you want to stop tracking this competitor feed?")) {
      try {
        const res = await fetch('/api/competitors', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: feedId })
        });
        if (res.ok) {
          alert('Competitor feed deleted successfully!');
          fetchData();
        } else {
          const data = await res.json();
          alert(`Error: ${data.error || 'Failed to delete feed'}`);
        }
      } catch (err) {
        console.error('Delete feed error:', err);
        alert('An unexpected error occurred.');
      }
    }
  };

  const handleDiscover = async () => {
    setDiscovering(true);
    try {
      const res = await fetch('/api/competitor-prices/discover', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`Discovery complete! Searched ${data.productsSearched} products, found ${data.newlyDiscoveredCount} new competitor feeds.`);
        fetchData();
      } else {
        const data = await res.json();
        alert(`Discovery failed: ${data.error}`);
      }
    } catch (err) {
      console.error('Discovery error:', err);
    } finally {
      setDiscovering(false);
    }
  };

  const handleAddTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/competitors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productId: selectedProductId,
          competitorId: selectedCompetitorId,
          competitorSku,
          url
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setCompetitorSku('');
        setUrl('');
        fetchData();
      } else {
        const data = await res.json();
        alert(`Failed to start tracking: ${data.error}`);
      }
    } catch (err) {
      console.error('Add tracking error:', err);
      alert('An error occurred while trying to connect the competitor feed.');
    }
  };

  const isViewer = userRole === 'Viewer';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Competitor Intelligence</h1>
          <p className="text-slate-400 text-sm mt-0.5">Benchmarking index and market price gaps tracker.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Find Competitors - full search from scratch */}
          <button
            onClick={handleDiscover}
            disabled={discovering || syncing || isViewer}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-800/60 bg-emerald-950/40 hover:bg-emerald-900/40 disabled:opacity-50 text-xs font-semibold text-emerald-300 transition-all"
          >
            <Search className={`w-3.5 h-3.5 ${discovering ? 'animate-pulse' : ''}`} />
            {discovering ? 'Searching...' : 'Find Competitors'}
          </button>

          {/* Sync Trigger - fast direct price scraping */}
          <button
            onClick={handleSync}
            disabled={syncing || discovering || isViewer}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 disabled:opacity-50 text-xs font-semibold text-slate-300 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing Feeds...' : 'Sync Market Prices'}
          </button>

          {/* Add Tracker */}
          <button
            onClick={() => setShowAddModal(true)}
            disabled={isViewer}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 disabled:opacity-50 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Feed</span>
          </button>
        </div>
      </div>

      {isViewer && (
        <div className="p-3.5 rounded-xl border border-amber-900/30 bg-amber-950/20 flex gap-2.5 items-start text-xs text-amber-300 text-left">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>You are logged in as a **Viewer**. Synchronizing competitor prices or adding catalog items trackers is restricted to Analysts and Admins.</span>
        </div>
      )}

      {/* Grid of tracked competitor items */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        {loading || pageTransitionLoading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-slate-500 text-xs">Loading competitors page...</p>
          </div>
        ) : groupedProducts.length === 0 ? (
          <div className="py-20 text-center text-slate-500 space-y-2">
            <Globe className="w-10 h-10 mx-auto text-slate-700 animate-pulse" />
            <p className="text-xs font-semibold">No competitors are currently tracked</p>
            <p className="text-[11px] text-slate-600">Click &quot;Add Feed&quot; to set up competitor price checks.</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-800">
            {paginatedGroupedProducts.map((p: any) => {
              const isExpanded = expandedProductIds.includes(p.productId);

              return (
                <div key={p.productId} className="flex flex-col transition-all duration-200">
                  {/* Product Header Row */}
                  <div 
                    onClick={() => toggleExpandProduct(p.productId)}
                    className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-slate-800/20 cursor-pointer select-none transition-colors duration-155"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-slate-400 p-1 rounded-lg hover:bg-slate-800 hover:text-slate-200 transition-colors shrink-0">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSingleSync(p.productId);
                        }}
                        disabled={isViewer || syncingProductId !== null || activeSyncs.includes(p.productId)}
                        className={`p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/30 text-indigo-400 hover:text-indigo-300 transition-all shrink-0 ${
                          isViewer ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Sync competitor prices for this product"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${syncingProductId === p.productId || activeSyncs.includes(p.productId) ? 'animate-spin text-emerald-400' : ''}`} />
                      </button>
                      <div className="text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">{p.productSku}</span>
                          <span className="text-[10px] text-indigo-400 font-bold bg-indigo-950/40 border border-indigo-900/30 px-2 py-0.5 rounded">
                            {p.competitors.length} {p.competitors.length === 1 ? 'Feed' : 'Feeds'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-200 mt-1">{p.productName}</h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 sm:gap-12 shrink-0 ml-8 sm:ml-0">
                      <div className="text-left">
                        <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Our Price</span>
                        <p className="text-sm font-black text-slate-200">₹{p.ourCurrentPrice.toFixed(2)}</p>
                      </div>

                      <div className="text-left hidden md:block">
                        <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">Market Range</span>
                        <p className="text-xs font-semibold text-slate-300 font-mono">
                          {(() => {
                            const prices = p.competitors.map((c: any) => c.latestPrice).filter((pr: number | null) => pr !== null) as number[];
                            if (prices.length === 0) return 'No data';
                            const minPrice = Math.min(...prices);
                            const maxPrice = Math.max(...prices);
                            return minPrice === maxPrice 
                              ? `₹${minPrice.toFixed(2)}`
                              : `₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)}`;
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Competitors Details Panel */}
                  {isExpanded && (
                    <div className="bg-slate-950/30 border-t border-slate-900/50 p-5 pl-12 space-y-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="text-left pb-1 border-b border-slate-900">
                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tracked Competitors Detail</h4>
                      </div>
                      
                      {p.competitors.length === 0 ? (
                        <div className="py-6 text-left text-slate-500 space-y-1">
                          <p className="text-xs font-semibold text-slate-400">No competitor feeds tracked for this product</p>
                          <p className="text-[11px] text-slate-500">
                            Automatic matching did not find listings on Amazon, Flipkart, Croma, Reliance Digital, or Vijay Sales. 
                            Click the <strong className="text-indigo-400 font-semibold font-sans">Add Feed</strong> button above to track competitor links manually.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {p.competitors.map((cp: any) => {
                            const gap = cp.latestPrice !== null ? cp.ourCurrentPrice - cp.latestPrice : 0;
                            const gapPercent = cp.latestPrice !== null ? ((cp.ourCurrentPrice - cp.latestPrice) / cp.latestPrice) * 100 : 0;

                            const chartData = cp.history
                              .map((h: any) => ({
                                price: Number(h.price),
                                timestamp: new Date(h.date).getTime(),
                                date: new Date(h.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                              }))
                              .sort((a: any, b: any) => a.timestamp - b.timestamp);

                            return (
                              <div 
                                key={cp.id} 
                                className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/10 hover:bg-slate-900/30 transition-colors duration-150 flex flex-col lg:flex-row gap-5 items-start lg:items-center justify-between"
                              >
                                {/* Competitor Name and Link */}
                                <div className="text-left space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-slate-200">{cp.competitorName}</span>
                                    <span className="sku-tag text-[10px] bg-slate-800/60 text-slate-400 px-2 py-0.5 rounded font-mono font-medium">{cp.competitorSku}</span>
                                  </div>
                                  {cp.competitorTitle && (
                                    <p className="text-[11px] text-slate-400 font-semibold leading-normal">
                                      Match: <span className="text-slate-300 font-normal italic">&ldquo;{cp.competitorTitle}&rdquo;</span>
                                    </p>
                                  )}
                                  {cp.competitorUrl ? (
                                    <a 
                                      href={cp.competitorUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline pt-0.5"
                                    >
                                      <Globe className="w-3.5 h-3.5" />
                                      <span>View Competitor Listing</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  ) : (
                                    <span className="text-[11px] text-slate-500 italic block pt-0.5">No listing URL linked</span>
                                  )}
                                </div>

                                {/* Price comparison metrics */}
                                <div className="grid grid-cols-2 gap-6 shrink-0 w-full lg:w-auto p-3.5 rounded-lg border border-slate-800/60 bg-slate-950/40 text-center lg:text-left">
                                  <div className="flex flex-col justify-center">
                                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Competitor Price</span>
                                    {editingId === cp.id ? (
                                      <div className="flex items-center gap-1.5 mt-1">
                                        <input
                                          type="number"
                                          value={editPriceValue}
                                          onChange={(e) => setEditPriceValue(e.target.value)}
                                          className="w-20 px-2 py-0.5 text-xs rounded border border-slate-700 bg-slate-900 text-white focus:outline-none focus:border-indigo-500 font-mono"
                                        />
                                        <button 
                                          onClick={() => handleSavePriceOverride(cp.id)}
                                          className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                        <button 
                                          onClick={() => setEditingId(null)}
                                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 mt-0.5 group">
                                        <p className="text-xs font-black text-slate-200">
                                          {cp.latestPrice ? `₹${cp.latestPrice.toFixed(2)}` : 'N/A'}
                                        </p>
                                        {!isViewer && (
                                          <button
                                            onClick={() => {
                                              setEditingId(cp.id);
                                              setEditPriceValue(cp.latestPrice ? cp.latestPrice.toString() : '');
                                            }}
                                            className="text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-slate-800"
                                            title="Override Price"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-500 block uppercase font-bold">Price Gap</span>
                                    {cp.latestPrice === null ? (
                                      <p className="text-xs font-bold text-slate-500">N/A</p>
                                    ) : (
                                      <div className={`text-xs font-black flex items-center justify-center lg:justify-start gap-0.5 ${gapPercent > 0 ? 'text-amber-400' : gapPercent < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                                        {gapPercent > 0 ? <TrendingUp className="w-3 h-3" /> : gapPercent < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                                        <span>{gapPercent > 0 ? `+${gapPercent.toFixed(1)}%` : `${gapPercent.toFixed(1)}%`}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Price History Sparkline & Action Button */}
                                <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto">
                                  <div 
                                    onClick={() => setSelectedHistoryFeedId(cp.id)}
                                    className="w-full lg:w-60 h-16 bg-slate-950/20 p-2 rounded-lg border border-slate-800 flex flex-col justify-between cursor-pointer hover:bg-slate-900/40 transition-colors duration-150"
                                    title="Click to view full price history chart"
                                  >
                                    <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider text-left">Price Trajectory</span>
                                    <div className="h-9 w-full mt-1">
                                      {chartData.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-slate-500 text-[9px]">
                                          No history logs
                                        </div>
                                      ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                          <LineChart 
                                            data={chartData} 
                                            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                                            onClick={() => setSelectedHistoryFeedId(cp.id)}
                                          >
                                            <XAxis dataKey="timestamp" type="number" domain={getXAxisDomain} hide />
                                            <YAxis hide domain={getYAxisDomain} />
                                            <Tooltip
                                              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px', padding: '4px 8px' }}
                                              labelStyle={{ fontSize: '8px', color: '#94a3b8' }}
                                              itemStyle={{ fontSize: '9px', color: '#fff', padding: 0 }}
                                              labelFormatter={(label) => new Date(label).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                              formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Price']}
                                            />
                                            <Line 
                                              type="monotone" 
                                              dataKey="price" 
                                              stroke="#6366f1" 
                                              strokeWidth={1.2} 
                                              dot={{ r: 1.5 }} 
                                              activeDot={{ r: 3.5 }} 
                                            />
                                          </LineChart>
                                        </ResponsiveContainer>
                                      )}
                                    </div>
                                  </div>

                                  {!isViewer && (
                                    <button
                                      onClick={() => handleDeleteFeed(cp.id)}
                                      className="feed-delete-btn p-2 rounded-lg border border-red-900/40 hover:border-red-500 bg-red-950/20 text-red-400 hover:text-red-300 transition-all shrink-0 cursor-pointer"
                                      title="Delete competitor feed"
                                    >
                                      <Trash className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-800/85 p-4 bg-slate-950/20">
              <span className="text-xs text-slate-400">
                Page {currentPage} of {totalPages} ({groupedProducts.length} products)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      page === currentPage
                        ? 'bg-indigo-650 text-white shadow-md shadow-indigo-650/10'
                        : 'border border-slate-800 text-slate-400 hover:bg-slate-950'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          </>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Track Competitor Product Feed</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleAddTracking} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Target Product in Catalog</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-400 focus:outline-none"
                >
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Competitor Source</label>
                <select
                  value={selectedCompetitorId}
                  onChange={(e) => setSelectedCompetitorId(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-400 focus:outline-none"
                >
                  {competitors.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Competitor Item SKU</label>
                <input
                  type="text"
                  required
                  value={competitorSku}
                  onChange={(e) => setCompetitorSku(e.target.value)}
                  placeholder="ED-AERO-ANC"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Competitor Listing URL</label>
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://electrodirect.com/product/ED-AERO-ANC"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-850 bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all"
                >
                  Start Tracking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price History Trajectory Modal */}
      {selectedHistoryFeed && (() => {
        const modalChartData = selectedHistoryFeed.history
          .map((h: any) => ({
            price: Number(h.price),
            timestamp: new Date(h.date).getTime()
          }))
          .sort((a: any, b: any) => a.timestamp - b.timestamp);

        const modalLogsData = [...selectedHistoryFeed.history]
          .map((h: any) => ({
            price: Number(h.price),
            timestamp: new Date(h.date).getTime()
          }))
          .sort((a: any, b: any) => b.timestamp - a.timestamp);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <div className="text-left">
                  <h3 className="text-base font-bold text-white">Price Trajectory History</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{selectedHistoryFeed.productName} on {selectedHistoryFeed.competitorName}</p>
                </div>
                <button onClick={() => setSelectedHistoryFeedId(null)} className="p-1 rounded hover:bg-slate-800 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Large Chart */}
              <div className="h-60 w-full bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                {modalChartData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    No history logs available
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={modalChartData} 
                      margin={{ top: 10, right: 10, left: 20, bottom: 10 }}
                    >
                      <XAxis 
                        dataKey="timestamp" 
                        type="number" 
                        domain={getXAxisDomain} 
                        stroke="#94a3b8" 
                        fontSize={9} 
                        tickLine={false} 
                        tickFormatter={(ts) => new Date(ts).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={9} 
                        tickLine={false} 
                        domain={getYAxisDomain} 
                        tickFormatter={(val) => `₹${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                        width={75}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px' }}
                        labelStyle={{ fontSize: '10px', color: '#94a3b8' }}
                        itemStyle={{ fontSize: '11px', color: '#fff' }}
                        labelFormatter={(label) => new Date(label).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                        formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Price']}
                      />
                      <Line type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Logs Table */}
              <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/20">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-slate-850 text-slate-400 font-semibold">
                      <th className="p-3">Date & Time</th>
                      <th className="p-3 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900/60 text-slate-300">
                    {modalLogsData.map((h: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="p-3 font-mono">{new Date(h.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</td>
                        <td className="p-3 text-right font-bold font-mono">₹{h.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setSelectedHistoryFeedId(null)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
