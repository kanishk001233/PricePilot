'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  Save, 
  Info, 
  AlertTriangle, 
  Percent, 
  TrendingUp, 
  Package, 
  Calendar,
  Lock,
  Play,
  RotateCcw,
  Plus,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function RulesPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string>('Viewer');
  const [updatingRuleId, setUpdatingRuleId] = useState<string | null>(null);

  // Local Simulator State
  const [simCost, setSimCost] = useState<number>(5000);
  const [simTargetMargin, setSimTargetMargin] = useState<number>(35);
  const [simCurrentPrice, setSimCurrentPrice] = useState<number>(7999);
  const [simMinPrice, setSimMinPrice] = useState<number>(6500);
  const [simMaxPrice, setSimMaxPrice] = useState<number>(12000);
  const [simInventory, setSimInventory] = useState<number>(10);
  const [simSeason, setSimSeason] = useState<string>('Summer');
  const [simCompetitors, setSimCompetitors] = useState<string>('7499, 7850');
  const [simResult, setSimResult] = useState<any>(null);

  const fetchData = async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setUserRole(meData.user.role);
      }

      const res = await fetch('/api/rules');
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error('Error fetching business rules:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          isActive: !currentStatus
        })
      });

      if (res.ok) {
        setRules(prev => prev.map(r => r.id === id ? { ...r, isActive: !currentStatus } : r));
      } else {
        const data = await res.json();
        alert(`Failed to toggle rule: ${data.error}`);
      }
    } catch (err) {
      console.error('Toggle rule error:', err);
    }
  };

  const handleUpdateParameter = (ruleId: string, paramKey: string, val: number) => {
    setRules(prev => prev.map(r => {
      if (r.id === ruleId) {
        return {
          ...r,
          parameters: {
            ...r.parameters,
            [paramKey]: val
          }
        };
      }
      return r;
    }));
  };

  const handleSaveParameters = async (rule: any) => {
    setUpdatingRuleId(rule.id);
    try {
      const res = await fetch('/api/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rule.id,
          parameters: rule.parameters
        })
      });

      if (res.ok) {
        alert(`Rule "${rule.name}" parameters saved successfully! Live pricing updates will apply these thresholds.`);
      } else {
        const data = await res.json();
        alert(`Failed to save: ${data.error}`);
      }
    } catch (err) {
      console.error('Save parameters error:', err);
    } finally {
      setUpdatingRuleId(null);
    }
  };

  const runSimulation = () => {
    const cost = Number(simCost);
    const targetMargin = Number(simTargetMargin);
    const currentPrice = Number(simCurrentPrice);
    const minPrice = Number(simMinPrice);
    const maxPrice = Number(simMaxPrice);
    const inventory = Number(simInventory);
    const season = simSeason;
    
    const compSnapshotPrices = simCompetitors
      .split(',')
      .map(p => Number(p.trim()))
      .filter(p => !isNaN(p) && p > 0);
      
    const competitorAverage = compSnapshotPrices.length > 0
      ? compSnapshotPrices.reduce((a, b) => a + b, 0) / compSnapshotPrices.length
      : null;
    const minCompetitorPrice = compSnapshotPrices.length > 0 ? Math.min(...compSnapshotPrices) : null;

    const minMarginRule = rules.find(r => r.code === 'MIN_MARGIN');
    const minMarginPercent = minMarginRule && minMarginRule.isActive 
      ? Number(minMarginRule.parameters.minMarginPercent) 
      : 15.0;

    const corridorRule = rules.find(r => r.code === 'COMPETITOR_CORRIDOR');
    const maxDiscountPercent = corridorRule && corridorRule.isActive 
      ? Number(corridorRule.parameters.maxDiscountPercent) 
      : 15.0;

    const targetMarginPrice = cost / (1 - (targetMargin / 100));
    const minMarginPrice = cost / (1 - (minMarginPercent / 100));

    let optimizedPrice = targetMarginPrice;
    let trace: string[] = [];
    trace.push(`Target Margin Price set to ₹${targetMarginPrice.toFixed(2)} (Cost: ₹${cost.toFixed(2)} with ${targetMargin}% margin)`);

    if (minCompetitorPrice !== null && competitorAverage !== null) {
      let competitorTarget = minCompetitorPrice * 0.99;
      trace.push(`Lowest Competitor Target: ₹${competitorTarget.toFixed(2)} (Undercuts ₹${minCompetitorPrice.toFixed(2)} by 1%)`);

      if (corridorRule && corridorRule.isActive) {
        const minAllowed = competitorAverage * (1 - (maxDiscountPercent / 100));
        if (competitorTarget < minAllowed) {
          competitorTarget = minAllowed;
          trace.push(`Corridor average clamp: Raised target price to ₹${minAllowed.toFixed(2)} (cannot discount more than ${maxDiscountPercent}% from market average of ₹${competitorAverage.toFixed(2)})`);
        }
      }

      if (competitorTarget >= minMarginPrice) {
        optimizedPrice = competitorTarget;
        trace.push(`Margin Floor Check: Passed (₹${optimizedPrice.toFixed(2)} is above the ₹${minMarginPrice.toFixed(2)} minimum margin floor)`);
      } else {
        optimizedPrice = minMarginPrice;
        trace.push(`Margin Floor Check: Violated! Price raised to minimum margin floor: ₹${minMarginPrice.toFixed(2)} (${minMarginPercent}% margin)`);
      }
    } else {
      trace.push(`No competitors specified. Prioritizing target margin & inventory rules.`);
      
      const scarcityRule = rules.find(r => r.code === 'STOCK_SCARCITY');
      const surplusRule = rules.find(r => r.code === 'STOCK_SURPLUS');
      
      if (scarcityRule && scarcityRule.isActive && inventory < scarcityRule.parameters.inventoryThreshold) {
        const premium = scarcityRule.parameters.pricePremiumPercent / 100;
        optimizedPrice *= (1 + premium);
        trace.push(`Stock Scarcity Premium: Applied (+${scarcityRule.parameters.pricePremiumPercent}%) because stock (${inventory}) < threshold (${scarcityRule.parameters.inventoryThreshold})`);
      } else if (surplusRule && surplusRule.isActive && inventory > surplusRule.parameters.inventoryThreshold) {
        const discount = surplusRule.parameters.priceDiscountPercent / 100;
        optimizedPrice *= (1 - discount);
        trace.push(`Stock Surplus Discount: Applied (-${surplusRule.parameters.priceDiscountPercent}%) because stock (${inventory}) > threshold (${surplusRule.parameters.inventoryThreshold})`);
      }

      const seasonalRule = rules.find(r => r.code === 'SEASONAL_BOOST');
      const currentMonth = new Date().getMonth();
      if (seasonalRule && seasonalRule.isActive && season !== 'All Year') {
        const peakMult = seasonalRule.parameters.peakMultiplier || 1.10;
        const offPeakMult = seasonalRule.parameters.offPeakMultiplier || 0.90;
        let isPeak = false;
        let isOffPeak = false;
        if (season === 'Summer' && [5, 6, 7].includes(currentMonth)) isPeak = true;
        else if (season === 'Summer' && [11, 0, 1].includes(currentMonth)) isOffPeak = true;
        if (season === 'Winter' && [11, 0, 1].includes(currentMonth)) isPeak = true;
        else if (season === 'Winter' && [5, 6, 7].includes(currentMonth)) isOffPeak = true;
        
        if (isPeak) {
          optimizedPrice *= peakMult;
          trace.push(`Seasonal Peak Booster: Applied multiplier x${peakMult} for ${season} relevance`);
        } else if (isOffPeak) {
          optimizedPrice *= offPeakMult;
          trace.push(`Seasonal Off-Peak markdown: Applied multiplier x${offPeakMult} for ${season} relevance`);
        }
      }
    }

    let finalPrice = optimizedPrice;
    if (optimizedPrice < minPrice) {
      finalPrice = minPrice;
      trace.push(`Catalog Boundaries Check: Violated! Price elevated to catalog floor: ₹${minPrice.toFixed(2)}`);
    } else if (optimizedPrice > maxPrice) {
      finalPrice = maxPrice;
      trace.push(`Catalog Boundaries Check: Violated! Price clamped to catalog ceiling: ₹${maxPrice.toFixed(2)}`);
    } else {
      trace.push(`Catalog Boundaries Check: Passed (price ₹${finalPrice.toFixed(2)} is within range ₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)})`);
    }

    let elasticityMult = 1.0;
    const priceDiffRatio = currentPrice > 0 ? (finalPrice - currentPrice) / currentPrice : 0;
    if (Math.abs(priceDiffRatio) > 0.001) {
      elasticityMult = Math.max(0.2, 1 + (-1.5 * priceDiffRatio));
    }
    
    const baseDemand = 25;
    const predictedDemand = Math.round(baseDemand * elasticityMult * (inventory > 0 ? Math.min(1.2, inventory / 10) : 0));
    const profit = Math.round((finalPrice - cost) * predictedDemand);

    setSimResult({
      recommendedPrice: finalPrice,
      predictedDemand,
      profit,
      trace
    });
  };

  const isAllowedToEdit = ['Admin', 'Manager'].includes(userRole);

  const getRuleIcon = (code: string) => {
    switch(code) {
      case 'MIN_MARGIN': return <Percent className="w-5 h-5 text-rose-500" />;
      case 'COMPETITOR_CORRIDOR': return <Sliders className="w-5 h-5 text-indigo-400" />;
      case 'STOCK_SCARCITY': return <Package className="w-5 h-5 text-amber-500" />;
      case 'STOCK_SURPLUS': return <Package className="w-5 h-5 text-sky-400" />;
      case 'SEASONAL_BOOST': return <Calendar className="w-5 h-5 text-emerald-400" />;
      default: return <Sliders className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Business Rules Console</h1>
          <p className="text-slate-400 text-sm mt-0.5">Control margin protections, stock coefficients, and competitor corridors.</p>
        </div>
      </div>

      {!isAllowedToEdit && (
        <div className="p-3.5 rounded-xl border border-amber-900/30 bg-amber-950/20 flex gap-2.5 items-start text-xs text-amber-300 text-left shadow-inner">
          <Lock className="w-4 h-4 shrink-0 mt-0.5" />
          <span>You have **{userRole}** view-only rights. Adjusting rule parameters or toggling rule status requires Manager or Admin permissions.</span>
        </div>
      )}

      {/* Main Split Layout */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-slate-500 text-xs">Loading rules configuration parameters...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Rules configuration list */}
          <div className="lg:col-span-7 space-y-6">
            {rules.map((rule) => (
              <div 
                key={rule.id}
                className={`p-5 rounded-2xl border bg-slate-900/20 backdrop-blur-xl shadow-xl flex flex-col justify-between transition-all duration-300 ${
                  rule.isActive 
                    ? 'border-indigo-500/20 shadow-indigo-900/5 ring-1 ring-indigo-500/5' 
                    : 'border-slate-800/80 opacity-60'
                }`}
              >
                
                {/* Rule info header */}
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 shadow-inner">
                        {getRuleIcon(rule.code)}
                      </div>
                      <div className="text-left">
                        <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">{rule.code}</span>
                        <h3 className="text-sm font-bold text-slate-200 mt-0.5 leading-normal">{rule.name}</h3>
                      </div>
                    </div>

                    {/* Glowing Switch */}
                    <button
                      onClick={() => handleToggleActive(rule.id, rule.isActive)}
                      disabled={!isAllowedToEdit}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        rule.isActive ? 'bg-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-slate-800'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                          rule.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Dynamic Help explanation card */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-900 text-slate-400 text-left text-xs leading-relaxed">
                    {rule.code === 'MIN_MARGIN' && 'Defines the lowest gross margin percent allowed. Any competitor-match suggestion below this floor is clamped.'}
                    {rule.code === 'COMPETITOR_CORRIDOR' && 'Sets boundaries relative to the market average price. Caps excessive premium markup or discount limits.'}
                    {rule.code === 'STOCK_SCARCITY' && 'Triggers an automatic premium price boost when inventory volumes drop below the specified threshold.'}
                    {rule.code === 'STOCK_SURPLUS' && 'Triggers a proactive discount markdown to liquidate inventory when stock levels exceed the threshold.'}
                    {rule.code === 'SEASONAL_BOOST' && 'Applies multipliers based on product seasonality matching (Summer, Winter, Fall, Spring) and the current calendar month.'}
                  </div>

                  {/* Sliders Container */}
                  <div className="pt-3 border-t border-slate-950 space-y-4 text-left">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Configure Parameters</span>
                    <div className="space-y-4">
                      
                      {/* Sliders: MIN_MARGIN */}
                      {rule.code === 'MIN_MARGIN' && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <label className="text-[10px] text-slate-400 font-bold uppercase">MINIMUM ALLOWED MARGIN</label>
                            <span className="font-extrabold text-indigo-400 bg-indigo-950/60 border border-indigo-900/40 px-2.5 py-0.5 rounded-md">{rule.parameters.minMarginPercent || 0}%</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="60"
                            step="0.5"
                            disabled={!isAllowedToEdit}
                            value={rule.parameters.minMarginPercent || 15}
                            onChange={(e) => handleUpdateParameter(rule.id, 'minMarginPercent', Number(e.target.value))}
                            className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                          />
                        </div>
                      )}

                      {/* Sliders: COMPETITOR_CORRIDOR */}
                      {rule.code === 'COMPETITOR_CORRIDOR' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <label className="text-[10px] text-slate-400 font-bold uppercase">MAX PREMIUM</label>
                              <span className="font-extrabold text-indigo-400 bg-indigo-950/60 border border-indigo-900/40 px-2.5 py-0.5 rounded-md">+{rule.parameters.maxPremiumPercent || 0}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="40"
                              step="0.5"
                              disabled={!isAllowedToEdit}
                              value={rule.parameters.maxPremiumPercent || 10}
                              onChange={(e) => handleUpdateParameter(rule.id, 'maxPremiumPercent', Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <label className="text-[10px] text-slate-400 font-bold uppercase">MAX DISCOUNT</label>
                              <span className="font-extrabold text-indigo-400 bg-indigo-950/60 border border-indigo-900/40 px-2.5 py-0.5 rounded-md">-{rule.parameters.maxDiscountPercent || 0}%</span>
                            </div>
                            <input
                              type="range"
                              min="5"
                              max="40"
                              step="0.5"
                              disabled={!isAllowedToEdit}
                              value={rule.parameters.maxDiscountPercent || 15}
                              onChange={(e) => handleUpdateParameter(rule.id, 'maxDiscountPercent', Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Sliders: STOCK_SCARCITY */}
                      {rule.code === 'STOCK_SCARCITY' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <label className="text-[10px] text-slate-400 font-bold uppercase">SCARCITY LIMIT</label>
                              <span className="font-extrabold text-indigo-400 bg-indigo-950/60 border border-indigo-900/40 px-2.5 py-0.5 rounded-md">{rule.parameters.inventoryThreshold || 0} Units</span>
                            </div>
                            <input
                              type="range"
                              min="2"
                              max="30"
                              step="1"
                              disabled={!isAllowedToEdit}
                              value={rule.parameters.inventoryThreshold || 15}
                              onChange={(e) => handleUpdateParameter(rule.id, 'inventoryThreshold', Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <label className="text-[10px] text-slate-400 font-bold uppercase">SCARCITY BOOST</label>
                              <span className="font-extrabold text-indigo-400 bg-indigo-950/60 border border-indigo-900/40 px-2.5 py-0.5 rounded-md">+{rule.parameters.pricePremiumPercent || 0}%</span>
                            </div>
                            <input
                              type="range"
                              min="2"
                              max="30"
                              step="0.5"
                              disabled={!isAllowedToEdit}
                              value={rule.parameters.pricePremiumPercent || 12}
                              onChange={(e) => handleUpdateParameter(rule.id, 'pricePremiumPercent', Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Sliders: STOCK_SURPLUS */}
                      {rule.code === 'STOCK_SURPLUS' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <label className="text-[10px] text-slate-400 font-bold uppercase">SURPLUS THRESHOLD</label>
                              <span className="font-extrabold text-indigo-400 bg-indigo-950/60 border border-indigo-900/40 px-2.5 py-0.5 rounded-md">{rule.parameters.inventoryThreshold || 0} Units</span>
                            </div>
                            <input
                              type="range"
                              min="50"
                              max="200"
                              step="5"
                              disabled={!isAllowedToEdit}
                              value={rule.parameters.inventoryThreshold || 100}
                              onChange={(e) => handleUpdateParameter(rule.id, 'inventoryThreshold', Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <label className="text-[10px] text-slate-400 font-bold uppercase">MARKDOWN PERCENT</label>
                              <span className="font-extrabold text-indigo-400 bg-indigo-950/60 border border-indigo-900/40 px-2.5 py-0.5 rounded-md">-{rule.parameters.priceDiscountPercent || 0}%</span>
                            </div>
                            <input
                              type="range"
                              min="2"
                              max="25"
                              step="0.5"
                              disabled={!isAllowedToEdit}
                              value={rule.parameters.priceDiscountPercent || 10}
                              onChange={(e) => handleUpdateParameter(rule.id, 'priceDiscountPercent', Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                        </div>
                      )}

                      {/* Sliders: SEASONAL_BOOST */}
                      {rule.code === 'SEASONAL_BOOST' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <label className="text-[10px] text-slate-400 font-bold uppercase">PEAK MULTIPLIER</label>
                              <span className="font-extrabold text-indigo-400 bg-indigo-950/60 border border-indigo-900/40 px-2.5 py-0.5 rounded-md">x{rule.parameters.peakMultiplier || 1.0}</span>
                            </div>
                            <input
                              type="range"
                              min="1.0"
                              max="1.3"
                              step="0.01"
                              disabled={!isAllowedToEdit}
                              value={rule.parameters.peakMultiplier || 1.10}
                              onChange={(e) => handleUpdateParameter(rule.id, 'peakMultiplier', Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <label className="text-[10px] text-slate-400 font-bold uppercase">OFF-PEAK MULTIPLIER</label>
                              <span className="font-extrabold text-indigo-400 bg-indigo-950/60 border border-indigo-900/40 px-2.5 py-0.5 rounded-md">x{rule.parameters.offPeakMultiplier || 1.0}</span>
                            </div>
                            <input
                              type="range"
                              min="0.7"
                              max="1.0"
                              step="0.01"
                              disabled={!isAllowedToEdit}
                              value={rule.parameters.offPeakMultiplier || 0.90}
                              onChange={(e) => handleUpdateParameter(rule.id, 'offPeakMultiplier', Number(e.target.value))}
                              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>

                {/* Save button */}
                {isAllowedToEdit && (
                  <div className="pt-4 mt-4 border-t border-slate-950 flex justify-end">
                    <button
                      onClick={() => handleSaveParameters(rule)}
                      disabled={updatingRuleId === rule.id}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {updatingRuleId === rule.id ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                )}

              </div>
            ))}
          </div>

          {/* Right Column: Pricing Simulator Playground */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/85 rounded-3xl p-5 shadow-xl dark:shadow-black/50 backdrop-blur-xl space-y-5">
            <div className="text-left space-y-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-400 border border-indigo-900/50 text-[10px] font-bold uppercase tracking-wider">
                <Play className="w-2.5 h-2.5 fill-indigo-400" /> Sandpit environment
              </span>
              <h2 className="text-base font-black text-slate-900 dark:text-white pt-1">Pricing Simulation Playground</h2>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Test active business rules dynamically against hypothetical product catalog attributes.
              </p>
            </div>

            {/* Inputs Panel Grid */}
            <div className="grid grid-cols-2 gap-3 text-left">
              
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block uppercase">Cost Price (₹)</label>
                <input
                  type="number"
                  value={simCost}
                  onChange={(e) => setSimCost(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-850 bg-slate-950 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block uppercase">Target Margin (%)</label>
                <input
                  type="number"
                  value={simTargetMargin}
                  onChange={(e) => setSimTargetMargin(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-850 bg-slate-950 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block uppercase">Current store price (₹)</label>
                <input
                  type="number"
                  value={simCurrentPrice}
                  onChange={(e) => setSimCurrentPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-850 bg-slate-950 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block uppercase">Inventory stock</label>
                <input
                  type="number"
                  value={simInventory}
                  onChange={(e) => setSimInventory(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-850 bg-slate-950 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block uppercase">Catalog Floor Price (₹)</label>
                <input
                  type="number"
                  value={simMinPrice}
                  onChange={(e) => setSimMinPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-850 bg-slate-950 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block uppercase">Catalog Ceiling Price (₹)</label>
                <input
                  type="number"
                  value={simMaxPrice}
                  onChange={(e) => setSimMaxPrice(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-850 bg-slate-950 text-slate-200 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block uppercase">Seasonal Relevance</label>
                <select
                  value={simSeason}
                  onChange={(e) => setSimSeason(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-850 bg-slate-950 text-slate-400 focus:outline-none"
                >
                  <option value="All Year">All Year</option>
                  <option value="Summer">Summer</option>
                  <option value="Winter">Winter</option>
                  <option value="Spring">Spring</option>
                  <option value="Fall">Fall</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold block uppercase flex items-center gap-1">
                  Competitors prices 
                  <span className="group relative cursor-pointer text-slate-400 hover:text-slate-200">
                    <HelpCircle className="w-3 h-3" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-48 p-2 rounded-lg bg-slate-950 text-[9px] font-normal leading-normal text-slate-300 border border-slate-850 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      Comma separated prices. E.g. "12000, 12500". Leave empty to simulate non-competitive fallback.
                    </span>
                  </span>
                </label>
                <input
                  type="text"
                  value={simCompetitors}
                  onChange={(e) => setSimCompetitors(e.target.value)}
                  placeholder="e.g. 7499, 7850"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-850 bg-slate-950 text-slate-200 focus:outline-none"
                />
              </div>

            </div>

            {/* Run Button */}
            <button
              onClick={runSimulation}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-xs transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.99]"
            >
              Run Rules Simulation
            </button>

            {/* Result Area */}
            {simResult && (
              <div className="pt-4 border-t border-slate-850 space-y-4 text-left animate-in fade-in duration-200">
                
                {/* Result KPI Cards */}
                <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 flex justify-between items-center shadow-inner">
                  <div>
                    <span className="text-[9px] font-bold text-indigo-400 block uppercase tracking-wider">Recommended Price</span>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mt-0.5">₹{simResult.recommendedPrice.toLocaleString()}</h3>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">Margin Estimate</span>
                    <p className="text-sm font-black text-emerald-400 mt-0.5">
                      +₹{(simResult.recommendedPrice - simCost).toLocaleString()} 
                      <span className="text-slate-400 text-xs font-normal ml-1">
                        ({(((simResult.recommendedPrice - simCost) / simResult.recommendedPrice) * 100).toFixed(1)}%)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Demand impact forecast */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-slate-850 bg-slate-950/20">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">Projected Demand</span>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{simResult.predictedDemand} units <span className="text-[10px] font-normal text-slate-500">/ 30D</span></p>
                  </div>
                  <div className="p-3 rounded-xl border border-slate-850 bg-slate-950/20">
                    <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">Projected Gross Profit</span>
                    <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5">₹{simResult.profit.toLocaleString()}</p>
                  </div>
                </div>

                {/* Simulation Trace Steps */}
                <div className="space-y-2.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Simulation Execution Trace</span>
                  <div className="space-y-1.5">
                    {simResult.trace.map((step: string, index: number) => {
                      const isViolation = step.toLowerCase().includes('violated');
                      const isClamp = step.toLowerCase().includes('clamp');
                      return (
                        <div key={index} className="flex gap-2.5 items-start text-[11px] leading-relaxed">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                            isViolation ? 'bg-rose-500 animate-pulse' : isClamp ? 'bg-amber-500' : 'bg-indigo-500'
                          }`}></span>
                          <span className={`${isViolation ? 'text-rose-400' : isClamp ? 'text-amber-400' : 'text-slate-300'}`}>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
