'use client';

import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  HelpCircle, 
  Check, 
  X, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft,
  MessageSquare, 
  Clock, 
  User, 
  Play, 
  AlertCircle,
  AlertTriangle
} from 'lucide-react';

import { useTheme } from '@/lib/ThemeProvider';

export default function RecommendationsPage() {
  const { 
    recommendationsData, 
    loadingRecommendations, 
    preloadRecommendations,
    userRole,
    userEmail,
    competitorsData,
    preloadCompetitors,
    preloadProducts,
    showAlert
  } = useTheme();

  const recommendations = recommendationsData;
  const loading = recommendations.length === 0 && (loadingRecommendations || !competitorsData);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [loadedPages, setLoadedPages] = useState<number[]>([1]);
  const [pageTransitionLoading, setPageTransitionLoading] = useState(false);
  const pageSize = 6;
  
  // Recalculating state
  const [calculating, setCalculating] = useState(false);
  
  // Selection/Detail drawer state
  const [selectedRec, setSelectedRec] = useState<any>(null);
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    try {
      await Promise.all([
        preloadRecommendations(true),
        preloadCompetitors(true),
        preloadProducts(true)
      ]);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
    }
  };

  useEffect(() => {
    if (recommendations.length === 0 || !competitorsData) {
      fetchData();
    }
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setLoadedPages([1]);
  }, [recommendations]);

  const totalPages = Math.ceil(recommendations.length / pageSize) || 1;

  // Background preload next page
  useEffect(() => {
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

  const paginatedRecommendations = React.useMemo(() => {
    return recommendations.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [recommendations, currentPage]);

  const handleRecalculate = async () => {
    setCalculating(true);
    try {
      const res = await fetch('/api/pricing/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // all products
      });

      if (res.ok) {
        showAlert('Recalculation Complete', 'Pricing engine recalculation complete! New recommendations generated.', 'success');
        fetchData();
        setSelectedRec(null);
      } else {
        const data = await res.json();
        showAlert('Recalculation Error', data.error || 'Failed to recalculate pricing recommendations.', 'error');
      }
    } catch (err) {
      console.error('Error recalculating:', err);
    } finally {
      setCalculating(false);
    }
  };

  const handleProcessRecommendation = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/pricing/recommendations/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: reviewerNotes })
      });

      if (res.ok) {
        showAlert('Action Successful', `Price change successfully ${action}d!`, 'success');
        setReviewerNotes('');
        setSelectedRec(null);
        fetchData();
      } else {
        const data = await res.json();
        showAlert('Action Failed', data.error || `Failed to ${action} recommendation.`, 'error');
      }
    } catch (err) {
      console.error(`Error processing ${action}:`, err);
    } finally {
      setActionLoading(false);
    }
  };

  const isAllowedToProcess = ['Admin', 'Manager'].includes(userRole);
  const isAllowedToCalculate = ['Admin', 'Pricing Analyst', 'Manager'].includes(userRole);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Pricing Intelligence Engine</h1>
          <p className="text-slate-400 text-sm mt-0.5">Review margin simulations, expected conversions, and approve optimized recommendations.</p>
        </div>

        <button
          onClick={handleRecalculate}
          disabled={calculating || !isAllowedToCalculate}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 transition-all"
        >
          <Play className={`w-3.5 h-3.5 ${calculating ? 'animate-pulse' : ''}`} />
          {calculating ? 'Running Simulations...' : 'Optimize Catalog'}
        </button>
      </div>

      {/* Role Warnings */}
      {!isAllowedToProcess && (
        <div className="p-3.5 rounded-xl border border-amber-900/30 bg-amber-950/20 flex gap-2.5 items-start text-xs text-amber-300 text-left">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>You are logged in as a **{userRole}**. Pricing recommendations require Manager or Admin approval to update live catalog selling prices.</span>
        </div>
      )}

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: recommendations list */}
        <div className={`space-y-4 ${selectedRec ? 'lg:col-span-7' : 'lg:col-span-12'} transition-all duration-300`}>
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
            {loading || pageTransitionLoading ? (
              <div className="py-24 text-center animate-pulse">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-3 text-slate-500 text-xs">Simulating model suggestions...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="py-20 text-center text-slate-500 space-y-2">
                <Sparkles className="w-10 h-10 mx-auto text-slate-700 animate-pulse" />
                <p className="text-xs font-semibold">No recommendations available</p>
                <p className="text-[11px] text-slate-600">Click &quot;Optimize Catalog&quot; to calculate optimal margins prices.</p>
              </div>
            ) : (
              <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-5 py-4 font-semibold">Product</th>
                      <th className="px-5 py-4 font-semibold text-right">Current Price</th>
                      <th className="px-5 py-4 font-semibold text-right">Suggested Price</th>
                      <th className="px-5 py-4 font-semibold text-right">Expected Margin</th>
                      <th className="px-5 py-4 font-semibold text-center">Confidence</th>
                      <th className="px-5 py-4 font-semibold text-center">Status</th>
                      <th className="px-5 py-4 font-semibold text-right">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {paginatedRecommendations.map((r) => {
                      const priceDiff = r.suggestedPrice - r.currentPrice;
                      const priceDiffPercent = ((r.suggestedPrice - r.currentPrice) / r.currentPrice) * 100;
                      const suggestedMarginPercent = Math.round(((r.suggestedPrice - r.costPrice) / r.suggestedPrice) * 100);

                      return (
                        <tr 
                          key={r.id} 
                          onClick={() => {
                            setSelectedRec(r);
                            setReviewerNotes(r.notes || '');
                          }}
                          className={`cursor-pointer transition-colors ${
                            selectedRec?.id === r.id 
                              ? 'bg-indigo-950/20 hover:bg-indigo-950/30' 
                              : 'hover:bg-slate-900/10'
                          }`}
                        >
                          <td className="px-5 py-4">
                            <span className="text-[9px] font-bold text-slate-500 block mb-0.5">{r.productSku}</span>
                            <div className="font-semibold text-slate-200 truncate max-w-[180px]">{r.productName}</div>
                          </td>
                          <td className="px-5 py-4 text-right text-slate-400">₹{r.currentPrice.toFixed(2)}</td>
                          <td className="px-5 py-4 text-right">
                            <div className="font-black text-indigo-400">₹{r.suggestedPrice.toFixed(2)}</div>
                            <div className={`text-[9px] font-bold flex items-center justify-end gap-0.5 mt-0.5 ${priceDiff > 0 ? 'text-emerald-400' : priceDiff < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                              {priceDiff > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : priceDiff < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : null}
                              <span>{priceDiffPercent > 0 ? `+${priceDiffPercent.toFixed(1)}%` : priceDiffPercent < 0 ? `${priceDiffPercent.toFixed(1)}%` : '0.0%'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="font-semibold text-slate-200">₹{r.marginEstimate.toFixed(2)}</div>
                            <span className="text-[9px] text-slate-400">({suggestedMarginPercent}% margin)</span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <span className="font-semibold text-slate-200">{Math.round(r.confidenceScore)}%</span>
                              <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                                <div 
                                  className={`h-full rounded-full ${r.confidenceScore > 80 ? 'bg-emerald-500' : r.confidenceScore > 65 ? 'bg-indigo-500' : 'bg-rose-500'}`}
                                  style={{ width: `${r.confidenceScore}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded font-bold text-[9px] ${
                              r.status === 'Approved'
                                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20'
                                : r.status === 'Rejected'
                                  ? 'bg-rose-950/40 text-rose-400 border border-rose-900/20'
                                  : 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/20'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <ChevronRight className="w-4 h-4 text-slate-500 ml-auto" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                {paginatedRecommendations.map((r) => {
                  const priceDiff = r.suggestedPrice - r.currentPrice;
                  const priceDiffPercent = ((r.suggestedPrice - r.currentPrice) / r.currentPrice) * 100;
                  const suggestedMarginPercent = Math.round(((r.suggestedPrice - r.costPrice) / r.suggestedPrice) * 100);
                  const isSelected = selectedRec?.id === r.id;

                  return (
                    <div 
                      key={r.id} 
                      onClick={() => {
                        setSelectedRec(r);
                        setReviewerNotes(r.notes || '');
                      }}
                      className={`p-4 rounded-xl border transition-all text-left space-y-3 cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-950/20 border-indigo-500/50' 
                          : 'bg-slate-900/40 border-slate-800/80 hover:border-slate-700/60'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-500 font-bold block">{r.productSku}</span>
                          <span className="text-sm font-bold text-slate-200 block truncate max-w-[200px]">{r.productName}</span>
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded font-bold text-[9px] ${
                          r.status === 'Approved'
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20'
                            : r.status === 'Rejected'
                              ? 'bg-rose-950/40 text-rose-400 border border-rose-900/20'
                              : 'bg-indigo-950/40 text-indigo-400 border border-indigo-900/20'
                        }`}>
                          {r.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-900/60">
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Current Price</span>
                          <span className="text-slate-400">₹{r.currentPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Suggested Price</span>
                          <span className="text-indigo-400 font-bold">₹{r.suggestedPrice.toFixed(2)}</span>
                          <span className={`text-[9px] font-bold inline-flex items-center gap-0.5 ml-1 ${priceDiff > 0 ? 'text-emerald-400' : priceDiff < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                            {priceDiff > 0 ? '▲' : priceDiff < 0 ? '▼' : ''} {Math.abs(priceDiffPercent).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Expected Margin</span>
                          <span className="text-slate-300">₹{r.marginEstimate.toFixed(2)} ({suggestedMarginPercent}%)</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Model Confidence</span>
                          <span className="text-slate-200 font-semibold">{Math.round(r.confidenceScore)}%</span>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <span className="text-[11px] text-indigo-400 font-semibold flex items-center gap-0.5">
                          <span>Review details</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-800/85 p-4 bg-slate-950/20">
                  <span className="text-xs text-slate-400">
                    Page {currentPage} of {totalPages} ({recommendations.length} recommendations)
                  </span>
                  <div className="flex items-center gap-1 text-slate-400">
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
                            ? 'bg-indigo-600 text-white shadow-md'
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
        </div>

        {/* Backdrop overlay for mobile bottom drawer */}
        {selectedRec && (
          <div 
            onClick={() => setSelectedRec(null)}
            className="lg:hidden fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
          />
        )}

        {/* Right column: Recommendation Details Drawer */}
        {selectedRec && (
          <div className="fixed inset-x-0 bottom-0 lg:relative lg:inset-auto z-50 lg:z-auto lg:col-span-5 bg-slate-900 dark:bg-slate-900 border-t lg:border-t-0 lg:border border-slate-800 rounded-t-2xl lg:rounded-2xl p-6 shadow-2xl space-y-5 animate-in slide-in-from-bottom lg:slide-in-from-right-4 duration-300 max-h-[85vh] lg:max-h-none overflow-y-auto lg:overflow-visible">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{selectedRec.productSku}</span>
                <h3 className="text-sm font-bold text-white leading-normal mt-0.5">{selectedRec.productName}</h3>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Brand: {selectedRec.productBrand}</span>
              </div>
              <button 
                onClick={() => setSelectedRec(null)} 
                className="p-1 rounded bg-slate-950/30 hover:bg-slate-800 text-slate-500 hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Overview Pricing Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-950/30 border border-slate-800/80">
                <span className="text-[9px] text-slate-500 font-bold block uppercase">CURRENT PRICE</span>
                <span className="text-base font-black text-slate-300">₹{selectedRec.currentPrice.toFixed(2)}</span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/30">
                <span className="text-[9px] text-indigo-400 font-bold block uppercase">SUGGESTED PRICE</span>
                <span className="text-base font-black text-indigo-400">₹{selectedRec.suggestedPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Price Corridor Boundary slider visualization */}
            <div className="space-y-1 bg-slate-950/20 p-3 rounded-xl border border-slate-800/50 text-[10px]">
              <div className="flex justify-between font-bold text-slate-500 mb-1">
                <span>COST PRICE: ₹{selectedRec.costPrice.toFixed(2)}</span>
                <span>SUGGESTED RANGE BOUNDS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">₹{selectedRec.minSuggestedPrice.toFixed(2)}</span>
                <div className="flex-1 h-2 bg-slate-800 rounded-full relative overflow-hidden">
                  <div 
                    className="absolute h-full bg-indigo-500 rounded-full"
                    style={{ 
                      left: '30%', 
                      right: '30%' 
                    }}
                  ></div>
                  <div 
                    className="absolute w-2.5 h-2.5 bg-white border border-indigo-600 rounded-full top-[-1px]"
                    style={{ left: '50%' }}
                  ></div>
                </div>
                <span className="text-slate-400 font-semibold">₹{selectedRec.maxSuggestedPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* AI Reasoning Summary */}
            <div className="space-y-2 p-3.5 rounded-xl border border-indigo-950 bg-indigo-950/20 text-left">
              <div className="flex items-center gap-2 text-indigo-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold">AI Decision Engine Summary</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                {selectedRec.explanation.summary}
              </p>
            </div>

            {/* Tracked Competitor Prices Bullet Points */}
            {(() => {
              const competitorFeeds = competitorsData?.competitorProducts?.filter(
                (cp: any) => cp.productId === selectedRec.productId
              ) || [];
              return (
                <div className="space-y-2.5 text-left bg-slate-950/20 p-3.5 rounded-xl border border-slate-800/40">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Competitor Pricing</span>
                  {competitorFeeds.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No active competitor feeds tracked for this product.</p>
                  ) : (
                    <ul className="space-y-1.5 list-disc pl-4">
                      {competitorFeeds.map((feed: any) => (
                        <li key={feed.id} className="text-xs text-slate-350">
                          <span className="font-bold text-slate-300">{feed.competitorName}</span>: {feed.latestPrice !== null ? `₹${feed.latestPrice.toFixed(2)}` : 'No price data'}
                          {feed.competitorSku && <span className="text-[10px] text-slate-500 ml-1.5 font-mono">({feed.competitorSku})</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}

            {/* Contributing factors */}
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contributing Rules & Signals</span>
              <ul className="space-y-2">
                {selectedRec.explanation.factors.map((factor: string, idx: number) => (
                  <li key={idx} className="flex gap-2 text-xs text-slate-400 leading-normal">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Projections Metrics */}
            <div className="pt-3.5 border-t border-slate-800 space-y-2.5 text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estimated 30D Forecast Impact</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-500 block">EXPECTED SALES VOLUME</span>
                  <p className="text-xs font-bold text-slate-300">{selectedRec.predictedDemand} units</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">EXPECTED REVENUE</span>
                  <p className="text-xs font-bold text-slate-300">₹{selectedRec.revenueEstimate.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Notes & Workflow Actions */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Reviewer Notes</label>
                <textarea
                  placeholder={selectedRec.status !== 'Pending' ? 'No notes provided' : 'Add approval reasoning or comments...'}
                  disabled={selectedRec.status !== 'Pending' || !isAllowedToProcess}
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  className="w-full h-16 p-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none disabled:text-slate-500"
                ></textarea>
              </div>

              {selectedRec.status === 'Pending' ? (
                <div className="flex gap-2.5">
                  <button
                    onClick={() => handleProcessRecommendation(selectedRec.id, 'reject')}
                    disabled={actionLoading || !isAllowedToProcess}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-rose-950/20 hover:border-rose-900/20 text-rose-400 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleProcessRecommendation(selectedRec.id, 'approve')}
                    disabled={actionLoading || !isAllowedToProcess}
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve & Live
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/30 text-xs text-left">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Processed Details</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Status: <span className={selectedRec.status === 'Approved' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{selectedRec.status}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Reviewer: <span className="font-medium">{selectedRec.processedBy}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Timestamp: <span className="font-medium">{new Date(selectedRec.processedAt).toLocaleString()}</span>
                  </p>
                  {selectedRec.notes && (
                    <div className="mt-2 p-2 rounded bg-slate-900 border border-slate-850 text-slate-400 text-[10px]">
                      &quot;{selectedRec.notes}&quot;
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
