import { db } from '../lib/db';
import { PriceRecommendation, Product, SalesTransaction } from '../lib/seedData';

export const PricingEngine = {
  /**
   * Forecasts demand for a product based on price elasticity, seasonality, stock levels, and historical transactions.
   */
  async forecastDemand(
    productId: string, 
    daysAhead: number = 30, 
    customPrice?: number
  ): Promise<{
    predictedDemand: number;
    confidenceScore: number;
    trend: 'up' | 'down' | 'stable';
    factors: string[];
    baseVolume: number;
  }> {
    const product = await db.getProductById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const transactions = await db.getSalesTransactions();
    const productTx = transactions.filter(t => t.productId === productId);
    const rules = await db.getBusinessRules();
    
    // 1. Calculate Base Daily Volume
    let totalQty = 0;
    let daysWithSales = new Set<string>();
    
    productTx.forEach(t => {
      totalQty += t.quantity;
      const dateStr = t.transactionDate.substring(0, 10);
      daysWithSales.add(dateStr);
    });

    const factors: string[] = [];
    const totalDaysObserved = 30;
    let baseDailyVolume = totalQty / totalDaysObserved;
    
    // Fallback baseline for products without transaction history
    if (totalQty === 0) {
      baseDailyVolume = 0.2; // 6 units per 30 days
      factors.push("No sales transaction history; using a baseline velocity of 6 units/month.");
    }
    const baseVolumeForPeriod = baseDailyVolume * daysAhead;

    // Factors listing
    let demandMultiplier = 1.0;

    // 2. Seasonality Factor
    const currentMonth = new Date().getMonth(); // 5 is June (Summer)
    const seasonalRule = rules.find(r => r.code === 'SEASONAL_BOOST');
    
    if (seasonalRule && seasonalRule.isActive) {
      const peakMult = seasonalRule.parameters.peakMultiplier || 1.10;
      const offPeakMult = seasonalRule.parameters.offPeakMultiplier || 0.90;
      
      const relevance = product.seasonalRelevance; // 'Summer', 'Winter', 'Spring', 'Fall', 'All Year'
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
        factors.push(`Peak seasonal relevance (${relevance}) increases projected demand by ${Math.round((peakMult - 1) * 100)}%`);
      } else if (isOffPeak) {
        demandMultiplier *= offPeakMult;
        factors.push(`Off-peak seasonal relevance (${relevance}) reduces projected demand by ${Math.round((1 - offPeakMult) * 100)}%`);
      }
    }

    // 3. Price Elasticity Factor (PED)
    const targetPrice = customPrice !== undefined ? customPrice : product.currentPrice;
    const priceDiffRatio = product.currentPrice > 0 ? (targetPrice - product.currentPrice) / product.currentPrice : 0;
    
    // Assume typical price elasticity of demand coefficient is -1.5
    const elasticity = -1.5;
    let elasticityMultiplier = 1.0;

    if (Math.abs(priceDiffRatio) > 0.001) {
      elasticityMultiplier = 1 + (elasticity * priceDiffRatio);
      elasticityMultiplier = Math.max(0.2, elasticityMultiplier); // floor at 80% drop
      const direction = priceDiffRatio > 0 ? 'increase' : 'decrease';
      factors.push(`Price ${direction} of ${Math.round(Math.abs(priceDiffRatio) * 100)}% alters demand by ${Math.round((elasticityMultiplier - 1) * 100)}% due to price elasticity`);
    }

    // 4. Stock Out constraint
    let inventoryConstraint = 1.0;
    if (product.inventory === 0) {
      inventoryConstraint = 0.0;
      factors.push(`Out of stock - demand cannot be fulfilled`);
    } else if (product.inventory < baseVolumeForPeriod * demandMultiplier * elasticityMultiplier) {
      const potentialDemand = baseVolumeForPeriod * demandMultiplier * elasticityMultiplier;
      inventoryConstraint = product.inventory / potentialDemand;
      factors.push(`Inventory stockout risk: sales projection capped at remaining inventory (${product.inventory} units)`);
    }

    // Final demand calculation
    const predictedDemand = Math.max(
      0, 
      Math.round(baseVolumeForPeriod * demandMultiplier * elasticityMultiplier * inventoryConstraint)
    );

    // Confidence score calculation
    let confidenceScore = 80;
    if (productTx.length >= 25) confidenceScore += 5;
    else if (productTx.length < 10) confidenceScore -= 10;

    if (product.inventory === 0) confidenceScore = 95; 
    confidenceScore = Math.min(95, Math.max(50, confidenceScore));

    // Trend direction
    let trend: 'up' | 'down' | 'stable' = 'stable';
    const finalMult = demandMultiplier * elasticityMultiplier * inventoryConstraint;
    if (finalMult > 1.05) trend = 'up';
    else if (finalMult < 0.95) trend = 'down';

    return {
      predictedDemand,
      confidenceScore,
      trend,
      factors,
      baseVolume: Math.round(baseVolumeForPeriod)
    };
  },

  /**
   * Evaluates all parameters and pricing rules to compute the optimal price recommendation.
   */
  async generateRecommendation(productId: string): Promise<PriceRecommendation> {
    const product = await db.getProductById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const rules = await db.getBusinessRules();
    const competitorProducts = await db.getCompetitorProducts();
    const snapshots = await db.getCompetitorPriceSnapshots();

    // 1. Gather all latest competitor prices
    const productCompProds = competitorProducts.filter(cp => cp.productId === productId);
    const compPrices: { compName: string; price: number }[] = [];
    const competitors = await db.getCompetitors();
    
    productCompProds.forEach(cp => {
      const comp = competitors.find(c => c.id === cp.competitorId);
      const compName = comp ? comp.name : 'Competitor';
      const latestSnapshot = snapshots
        .filter(s => s.competitorProductId === cp.id)
        .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
      if (latestSnapshot && latestSnapshot.price > 0) {
        const outlierThreshold = Math.min(product.minPrice * 0.8, product.costPrice * 0.7);
        if (latestSnapshot.price >= outlierThreshold) {
          compPrices.push({ compName, price: latestSnapshot.price });
        } else {
          console.warn(`[PricingEngine] Excluded outlier price ₹${latestSnapshot.price} from ${compName} for "${product.name}"`);
        }
      }
    });

    const compSnapshotPrices = compPrices.map(c => c.price);
    const competitorAverage = compSnapshotPrices.length > 0
      ? compSnapshotPrices.reduce((a, b) => a + b, 0) / compSnapshotPrices.length
      : null;
    const minCompetitorPrice = compSnapshotPrices.length > 0 ? Math.min(...compSnapshotPrices) : null;
    const lowestComp = compPrices.find(c => c.price === minCompetitorPrice) || null;

    // Defensive margin calculations
    const rawTargetMargin = product.targetMargin !== undefined ? product.targetMargin : 30;
    const safeTargetMargin = Math.min(95, Math.max(1, rawTargetMargin));

    const minMarginRule = rules.find(r => r.code === 'MIN_MARGIN');
    const rawMinMarginPercent = minMarginRule && minMarginRule.isActive 
      ? minMarginRule.parameters.minMarginPercent 
      : 15.0;
    const safeMinMarginPercent = Math.min(90, Math.max(1, rawMinMarginPercent));

    const targetMarginPrice = product.costPrice / (1 - (safeTargetMargin / 100));
    const minMarginPrice = product.costPrice / (1 - (safeMinMarginPercent / 100));

    let optimizedPrice = targetMarginPrice;
    let activeConstraint = 'target-margin';
    let lowestCompetitorDetail = '';

    // 2. Decide strategy based on competitor presence
    if (minCompetitorPrice !== null && lowestComp !== null && competitorAverage !== null) {
      lowestCompetitorDetail = `Lowest competitor is ${lowestComp.compName} at ₹${minCompetitorPrice.toFixed(2)}`;
      let competitorTarget = minCompetitorPrice * 0.99;
      let finalTarget = competitorTarget;
      let wasCorridorClamped = false;
      
      // Check competitor corridor constraints
      const corridorRule = rules.find(r => r.code === 'COMPETITOR_CORRIDOR');
      if (corridorRule && corridorRule.isActive) {
        const maxDiscount = (corridorRule.parameters.maxDiscountPercent || 15) / 100;
        const minAllowed = competitorAverage * (1 - maxDiscount);
        if (competitorTarget < minAllowed) {
          finalTarget = minAllowed;
          wasCorridorClamped = true;
        }
      }

      if (finalTarget >= minMarginPrice) {
        optimizedPrice = finalTarget;
        activeConstraint = wasCorridorClamped ? 'corridor-clamp' : 'competitor-match';
      } else {
        optimizedPrice = minMarginPrice;
        activeConstraint = 'min-margin-floor';
      }
    } else {
      // Fallback: No competitor pricing available. Prioritize target margin and rules
      optimizedPrice = targetMarginPrice;
      activeConstraint = 'target-margin';
      
      // Apply Stock Scarcity / Surplus Rules
      const scarcityRule = rules.find(r => r.code === 'STOCK_SCARCITY');
      const surplusRule = rules.find(r => r.code === 'STOCK_SURPLUS');
      if (scarcityRule && scarcityRule.isActive && product.inventory < scarcityRule.parameters.inventoryThreshold) {
        const premium = (scarcityRule.parameters.pricePremiumPercent || 10) / 100;
        optimizedPrice *= (1 + premium);
        activeConstraint = 'stock-scarcity';
      } else if (surplusRule && surplusRule.isActive && product.inventory > surplusRule.parameters.inventoryThreshold) {
        const discount = (surplusRule.parameters.priceDiscountPercent || 10) / 100;
        optimizedPrice *= (1 - discount);
        activeConstraint = 'stock-surplus';
      }

      // Apply Seasonality Rules
      const seasonalRule = rules.find(r => r.code === 'SEASONAL_BOOST');
      const currentMonth = new Date().getMonth();
      if (seasonalRule && seasonalRule.isActive && product.seasonalRelevance !== 'All Year') {
        const peakMult = seasonalRule.parameters.peakMultiplier || 1.10;
        const offPeakMult = seasonalRule.parameters.offPeakMultiplier || 0.90;
        const relevance = product.seasonalRelevance;
        let isPeak = false;
        let isOffPeak = false;
        if (relevance === 'Summer' && [5, 6, 7].includes(currentMonth)) isPeak = true;
        else if (relevance === 'Summer' && [11, 0, 1].includes(currentMonth)) isOffPeak = true;
        if (relevance === 'Winter' && [11, 0, 1].includes(currentMonth)) isPeak = true;
        else if (relevance === 'Winter' && [5, 6, 7].includes(currentMonth)) isOffPeak = true;
        
        if (isPeak) {
          optimizedPrice *= peakMult;
          activeConstraint = 'seasonal-peak';
        } else if (isOffPeak) {
          optimizedPrice *= offPeakMult;
          activeConstraint = 'seasonal-offpeak';
        }
      }
    }

    // Apply product min/max boundary clamps
    let finalOptimizedPrice = optimizedPrice;
    if (optimizedPrice < product.minPrice) {
      finalOptimizedPrice = product.minPrice;
      activeConstraint = 'product-min-clamp';
    } else if (optimizedPrice > product.maxPrice) {
      finalOptimizedPrice = product.maxPrice;
      activeConstraint = 'product-max-clamp';
    }

    const suggestedPrice = Math.round(finalOptimizedPrice * 100) / 100;

    // Define consistent Suggested Price Range bounds relative to the final suggested price
    let minSuggestedPrice = Math.max(product.minPrice, minMarginPrice, suggestedPrice * 0.9);
    let maxSuggestedPrice = Math.min(product.maxPrice, suggestedPrice * 1.1);

    if (minSuggestedPrice > suggestedPrice) {
      minSuggestedPrice = suggestedPrice;
    }
    if (maxSuggestedPrice < suggestedPrice) {
      maxSuggestedPrice = suggestedPrice;
    }
    if (minSuggestedPrice > maxSuggestedPrice) {
      minSuggestedPrice = maxSuggestedPrice;
    }

    minSuggestedPrice = Math.round(minSuggestedPrice * 100) / 100;
    maxSuggestedPrice = Math.round(maxSuggestedPrice * 100) / 100;

    // Calculate Projected Impact
    const forecast = await this.forecastDemand(productId, 30, suggestedPrice);
    const unitMargin = suggestedPrice - product.costPrice;
    const marginEstimate = Math.round(unitMargin * forecast.predictedDemand * 100) / 100;
    const revenueEstimate = Math.round(suggestedPrice * forecast.predictedDemand * 100) / 100;

    // Construct clear, concise, active constraint factors
    const factors: string[] = [];
    if (lowestCompetitorDetail) {
      factors.push(lowestCompetitorDetail);
    } else {
      factors.push(`No active competitor pricing found. Prioritizing target margin: ₹${targetMarginPrice.toFixed(2)}`);
    }

    const currentMarginPercent = ((suggestedPrice - product.costPrice) / suggestedPrice) * 100;
    switch (activeConstraint) {
      case 'product-min-clamp':
        factors.push(`Price set to catalog floor: ₹${product.minPrice.toFixed(2)} to protect minimum allowed listing price.`);
        break;
      case 'product-max-clamp':
        factors.push(`Price set to catalog ceiling: ₹${product.maxPrice.toFixed(2)} to prevent exceeding maximum allowed listing price.`);
        break;
      case 'min-margin-floor':
        factors.push(`Enforced absolute minimum margin floor of ₹${minMarginPrice.toFixed(2)} (${safeMinMarginPercent}% margin) to safeguard profitability.`);
        break;
      case 'corridor-clamp':
        factors.push(`Price restricted to corridor limit of ₹${suggestedPrice.toFixed(2)} to avoid discounting excessively from market average.`);
        break;
      case 'competitor-match':
        factors.push(`Price optimized to ₹${suggestedPrice.toFixed(2)} to match market pressure, retaining a margin of ${currentMarginPercent.toFixed(1)}%.`);
        break;
      case 'stock-scarcity':
        factors.push(`Scarcity premium applied due to low stock levels (${product.inventory} units).`);
        break;
      case 'stock-surplus':
        factors.push(`Markdown applied to clear surplus stock levels (${product.inventory} units).`);
        break;
      case 'seasonal-peak':
        factors.push(`Seasonal peak premium applied for relevance profile "${product.seasonalRelevance}".`);
        break;
      case 'seasonal-offpeak':
        factors.push(`Seasonal off-peak discount applied for relevance profile "${product.seasonalRelevance}".`);
        break;
      case 'target-margin':
      default:
        factors.push(`Retaining standard target margin price: ₹${suggestedPrice.toFixed(2)} (${product.targetMargin}% margin).`);
        break;
    }

    // Generate accurate, non-conflicting reasoning summaries
    let summary = '';
    if (suggestedPrice < product.currentPrice) {
      const diff = product.currentPrice - suggestedPrice;
      summary = `A price decrease of ₹${diff.toFixed(2)} is recommended to match market pressures and improve velocity.`;
    } else if (suggestedPrice > product.currentPrice) {
      const diff = suggestedPrice - product.currentPrice;
      summary = `A price increase of ₹${diff.toFixed(2)} is recommended to capture value and align with active rules.`;
    } else {
      summary = `Price stabilized around current level (₹${suggestedPrice.toFixed(2)}). Active parameters indicate pricing is fully optimized.`;
    }

    // Adjust confidence score
    let confidenceScore = forecast.confidenceScore;
    if (competitorAverage === null) {
      confidenceScore -= 10;
      factors.push('Lack of competitor benchmarks reduces suggestion confidence score');
    } else {
      confidenceScore += 5;
    }
    confidenceScore = Math.min(95, Math.max(50, confidenceScore));

    return {
      id: '',
      productId,
      suggestedPrice,
      minSuggestedPrice,
      maxSuggestedPrice,
      predictedDemand: forecast.predictedDemand,
      confidenceScore,
      marginEstimate,
      revenueEstimate,
      explanation: {
        factors,
        summary
      },
      status: 'Pending',
      createdAt: new Date().toISOString()
    };
  }
};
