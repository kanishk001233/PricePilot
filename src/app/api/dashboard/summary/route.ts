import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { PricingEngine } from '@/services/PricingEngine';

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await db.getProducts();
    const categories = await db.getCategories();
    const transactions = await db.getSalesTransactions();
    const recommendations = await db.getRecommendations();
    const competitorProducts = await db.getCompetitorProducts();
    const snapshots = await db.getCompetitorPriceSnapshots();
    const rules = await db.getBusinessRules();

    // 1. Calculate Historical Sales Metrics (Last 30 days)
    let totalRevenue = 0;
    let totalCost = 0;
    let totalUnitsSold = 0;

    transactions.forEach(t => {
      const prod = products.find(p => p.id === t.productId);
      if (prod) {
        totalRevenue += t.revenue;
        totalCost += prod.costPrice * t.quantity;
        totalUnitsSold += t.quantity;
      }
    });

    const averageMarginPercent = totalRevenue > 0 
      ? ((totalRevenue - totalCost) / totalRevenue) * 100 
      : 0;

    // 2. Group Daily Transactions for the Trend Chart
    const dailyMap: Record<string, { date: string; revenue: number; units: number }> = {};
    
    // Initialize last 30 days with 0 values to ensure chart is filled
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().substring(0, 10);
      dailyMap[dateStr] = { date: dateStr, revenue: 0, units: 0 };
    }

    transactions.forEach(t => {
      const dateStr = t.transactionDate.substring(0, 10);
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].revenue += t.revenue;
        dailyMap[dateStr].units += t.quantity;
      }
    });

    const salesTrend = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Pre-index competitor snapshots by competitorProductId for efficient O(1) lookup
    const snapshotsByCompProd: Record<string, typeof snapshots> = {};
    snapshots.forEach(s => {
      if (!snapshotsByCompProd[s.competitorProductId]) {
        snapshotsByCompProd[s.competitorProductId] = [];
      }
      snapshotsByCompProd[s.competitorProductId].push(s);
    });

    // 3. Competitor Pricing Gap Analysis
    const competitorGaps: any[] = [];
    const highRiskItems: any[] = [];
    let lowInventoryCount = 0;

    const minMarginRule = rules.find(r => r.code === 'MIN_MARGIN');
    const minMarginPercent = minMarginRule && minMarginRule.isActive 
      ? minMarginRule.parameters.minMarginPercent 
      : 15;

    for (const prod of products) {
      if (prod.status !== 'Active') continue;

      // Low Inventory count
      if (prod.inventory < 15) {
        lowInventoryCount++;
      }

      // Calculate margins
      const currentMarginPercent = ((prod.currentPrice - prod.costPrice) / prod.currentPrice) * 100;
      
      // Margin Risk
      if (currentMarginPercent < minMarginPercent) {
        highRiskItems.push({
          id: prod.id,
          sku: prod.sku,
          name: prod.name,
          issue: 'Margin Violation',
          details: `Current margin is ${currentMarginPercent.toFixed(1)}% (minimum allowed: ${minMarginPercent}%)`,
          severity: 'high'
        });
      }

      // Get competitor prices
      const cpIds = competitorProducts.filter(cp => cp.productId === prod.id).map(cp => cp.id);
      const prodSnapshots: typeof snapshots = [];
      cpIds.forEach(cpId => {
        const snaps = snapshotsByCompProd[cpId] || [];
        prodSnapshots.push(...snaps);
      });
      prodSnapshots.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

      // Get latest snapshot for each competitor
      const latestPrices: Record<string, number> = {};
      prodSnapshots.forEach(s => {
        if (!latestPrices[s.competitorProductId]) {
          latestPrices[s.competitorProductId] = s.price;
        }
      });

      const competitorPricesList = Object.values(latestPrices);
      if (competitorPricesList.length > 0) {
        const compAvg = competitorPricesList.reduce((a, b) => a + b, 0) / competitorPricesList.length;
        const gapPercent = ((prod.currentPrice - compAvg) / compAvg) * 100;

        competitorGaps.push({
          sku: prod.sku,
          name: prod.name.length > 15 ? prod.name.substring(0, 15) + '...' : prod.name,
          ourPrice: prod.currentPrice,
          competitorAverage: Math.round(compAvg * 100) / 100,
          gapPercent: Math.round(gapPercent * 100) / 100
        });

        // Competitor Risk checks
        if (gapPercent < -15) {
          highRiskItems.push({
            id: prod.id,
            sku: prod.sku,
            name: prod.name,
            issue: 'Underpriced',
            details: `Priced ${Math.abs(gapPercent).toFixed(1)}% below competitor average ($${compAvg.toFixed(2)}). Leaving money on the table.`,
            severity: 'medium'
          });
        } else if (gapPercent > 15) {
          highRiskItems.push({
            id: prod.id,
            sku: prod.sku,
            name: prod.name,
            issue: 'Overpriced',
            details: `Priced ${gapPercent.toFixed(1)}% above competitor average ($${compAvg.toFixed(2)}). Risk of volume loss.`,
            severity: 'medium'
          });
        }
      }
    }

    // Perform demand forecasting in-memory to optimize dashboard load time and avoid N+1 queries
    let projectedRevenue = 0;
    let projectedProfit = 0;
    const activeProducts = products.filter(p => p.status === 'Active');
    const seasonalRule = rules.find(r => r.code === 'SEASONAL_BOOST');
    const peakMult = seasonalRule && seasonalRule.isActive ? (seasonalRule.parameters.peakMultiplier || 1.10) : 1.10;
    const offPeakMult = seasonalRule && seasonalRule.isActive ? (seasonalRule.parameters.offPeakMultiplier || 0.90) : 0.90;
    const currentMonth = new Date().getMonth();

    // Map transactions by product to do O(1) lookups
    const transactionsByProduct: Record<string, typeof transactions> = {};
    transactions.forEach(t => {
      if (!transactionsByProduct[t.productId]) {
        transactionsByProduct[t.productId] = [];
      }
      transactionsByProduct[t.productId].push(t);
    });

    const forecastResults = activeProducts.map((prod) => {
      const productTx = transactionsByProduct[prod.id] || [];
      let totalQty = 0;
      productTx.forEach(t => {
        totalQty += t.quantity;
      });

      const totalDaysObserved = 30;
      let baseDailyVolume = totalQty / totalDaysObserved;
      if (totalQty === 0) {
        baseDailyVolume = 0.2; // 6 units per 30 days
      }
      const baseVolumeForPeriod = baseDailyVolume * 30;

      let demandMultiplier = 1.0;
      if (seasonalRule && seasonalRule.isActive) {
        const relevance = prod.seasonalRelevance;
        let isPeak = false;
        let isOffPeak = false;
        if (relevance === 'Summer' && [5, 6, 7].includes(currentMonth)) isPeak = true;
        else if (relevance === 'Summer' && [11, 0, 1].includes(currentMonth)) isOffPeak = true;
        
        if (relevance === 'Winter' && [11, 0, 1].includes(currentMonth)) isPeak = true;
        else if (relevance === 'Winter' && [5, 6, 7].includes(currentMonth)) isOffPeak = true;
        
        if (relevance === 'Spring' && [2, 3, 4].includes(currentMonth)) isPeak = true;
        else if (relevance === 'Spring' && [8, 9, 10].includes(currentMonth)) isOffPeak = true;

        if (relevance === 'Fall' && [8, 9, 10].includes(currentMonth)) isPeak = true;
        else if (relevance === 'Fall' && [2, 3, 4].includes(currentMonth)) isOffPeak = true;

        if (isPeak) {
          demandMultiplier *= peakMult;
        } else if (isOffPeak) {
          demandMultiplier *= offPeakMult;
        }
      }

      let elasticityMultiplier = 1.0;
      let inventoryConstraint = 1.0;
      if (prod.inventory === 0) {
        inventoryConstraint = 0.0;
      } else if (prod.inventory < baseVolumeForPeriod * demandMultiplier * elasticityMultiplier) {
        const potentialDemand = baseVolumeForPeriod * demandMultiplier * elasticityMultiplier;
        inventoryConstraint = prod.inventory / potentialDemand;
      }

      const predictedDemand = Math.max(
        0, 
        Math.round(baseVolumeForPeriod * demandMultiplier * elasticityMultiplier * inventoryConstraint)
      );

      const expectedRevenue = predictedDemand * prod.currentPrice;
      const expectedProfit = predictedDemand * (prod.currentPrice - prod.costPrice);

      return { expectedRevenue, expectedProfit };
    });

    forecastResults.forEach(({ expectedRevenue, expectedProfit }) => {
      projectedRevenue += expectedRevenue;
      projectedProfit += expectedProfit;
    });

    const projectedMarginPercent = projectedRevenue > 0 
      ? (projectedProfit / projectedRevenue) * 100 
      : 0;

    const pendingRecommendationsCount = recommendations.filter(r => r.status === 'Pending').length;

    // 5. Category-wise Margin Distribution
    const categoryMargins = categories.map(cat => {
      const catProducts = products.filter(p => p.categoryId === cat.id && p.status === 'Active');
      let catRevenue = 0;
      let catCost = 0;

      catProducts.forEach(p => {
        const prodTx = transactionsByProduct[p.id] || [];
        prodTx.forEach(t => {
          catRevenue += t.revenue;
          catCost += p.costPrice * t.quantity;
        });
      });

      let margin = 0;
      if (catRevenue > 0) {
        margin = ((catRevenue - catCost) / catRevenue) * 100;
      } else {
        // Fallback to average target margin of active products in category
        const activeTargetMargins = catProducts.map(p => p.targetMargin);
        margin = activeTargetMargins.length > 0 
          ? activeTargetMargins.reduce((a, b) => a + b, 0) / activeTargetMargins.length 
          : 0;
      }
      
      return {
        name: cat.name,
        margin: Math.round(margin * 10) / 10
      };
    }).filter(c => c.margin > 0);

    return NextResponse.json({
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        averageMarginPercent: Math.round(averageMarginPercent * 10) / 10,
        totalUnitsSold,
        lowInventoryCount,
        pendingRecommendationsCount
      },
      forecast: {
        projectedRevenue: Math.round(projectedRevenue * 100) / 100,
        projectedMarginPercent: Math.round(projectedMarginPercent * 10) / 10,
        projectedProfit: Math.round(projectedProfit * 100) / 100
      },
      salesTrend,
      competitorGaps,
      categoryMargins,
      highRiskItems: highRiskItems.slice(0, 6) // limit to top 6 risk items
    });
  } catch (error) {
    console.error('Dashboard summary API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
