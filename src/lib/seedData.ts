export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId: string;
  brand: string;
  costPrice: number;
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  targetMargin: number; // in percentage, e.g. 35 for 35%
  inventory: number;
  seasonalRelevance: string; // 'Winter', 'Summer', 'Spring', 'Fall', 'All Year'
  status: 'Active' | 'Draft' | 'Archived';
  createdAt: string;
  updatedAt: string;
}

export interface Competitor {
  id: string;
  name: string;
  website: string;
}

export interface CompetitorProduct {
  id: string;
  productId: string;
  competitorId: string;
  competitorSku: string;
  url: string;
}

export interface CompetitorPriceSnapshot {
  id: string;
  competitorProductId: string;
  price: number;
  recordedAt: string;
}

export interface BusinessRule {
  id: string;
  name: string;
  code: string; // e.g. 'MIN_MARGIN'
  type: 'margin' | 'competitor' | 'inventory' | 'seasonal';
  parameters: Record<string, any>;
  isActive: boolean;
  updatedAt: string;
}

export interface PriceRecommendation {
  id: string;
  productId: string;
  suggestedPrice: number;
  minSuggestedPrice: number;
  maxSuggestedPrice: number;
  predictedDemand: number;
  confidenceScore: number;
  marginEstimate: number; // value
  revenueEstimate: number; // value
  explanation: {
    factors: string[];
    summary: string;
  };
  status: 'Pending' | 'Approved' | 'Rejected';
  notes?: string;
  createdAt: string;
  processedBy?: string;
  processedAt?: string;
}

export interface SalesTransaction {
  id: string;
  productId: string;
  quantity: number;
  priceSold: number;
  revenue: number;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  cashierEmail?: string | null;
  transactionDate: string;
}

export interface AuditLog {
  id: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'competitor' | 'stock' | 'margin' | 'system';
  isRead: boolean;
  createdAt: string;
}

// Helper to generate dates relative to now
const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Consumer Electronics', description: 'Smartphones, laptops, accessories, and audio gear' },
  { id: 'cat-2', name: 'Home Appliances', description: 'Smart devices, kitchenware, and climate control' },
  { id: 'cat-3', name: 'Fitness Gear', description: 'Wearables, exercise equipment, and apparel' },
  { id: 'cat-4', name: 'Office Furniture', description: 'Ergonomic chairs, desks, and office supplies' }
];

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    sku: 'PP-EL-001',
    name: 'AeroSound Pro ANC Headphones',
    categoryId: 'cat-1',
    brand: 'AeroSound',
    costPrice: 90.00,
    currentPrice: 199.99,
    minPrice: 120.00,
    maxPrice: 249.99,
    targetMargin: 45,
    inventory: 12, // low inventory -> triggers scarcity premium
    seasonalRelevance: 'All Year',
    status: 'Active',
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1)
  },
  {
    id: 'prod-2',
    sku: 'PP-EL-002',
    name: 'VoltCharge Pro 100W PowerBank',
    categoryId: 'cat-1',
    brand: 'VoltCharge',
    costPrice: 22.00,
    currentPrice: 49.99,
    minPrice: 35.00,
    maxPrice: 69.99,
    targetMargin: 50,
    inventory: 140, // high inventory -> triggers discount/liquidation
    seasonalRelevance: 'All Year',
    status: 'Active',
    createdAt: daysAgo(60),
    updatedAt: daysAgo(5)
  },
  {
    id: 'prod-3',
    sku: 'PP-HA-101',
    name: 'SmartBreeze Tower Fan v2',
    categoryId: 'cat-2',
    brand: 'SmartBreeze',
    costPrice: 45.00,
    currentPrice: 99.99,
    minPrice: 69.99,
    maxPrice: 149.99,
    targetMargin: 40,
    inventory: 65,
    seasonalRelevance: 'Summer', // seasonal relevance -> peak demand in summer (June is summer!)
    status: 'Active',
    createdAt: daysAgo(45),
    updatedAt: daysAgo(2)
  },
  {
    id: 'prod-4',
    sku: 'PP-FG-201',
    name: 'TitanFit GPS Smartwatch',
    categoryId: 'cat-3',
    brand: 'TitanFit',
    costPrice: 110.00,
    currentPrice: 249.99,
    minPrice: 180.00,
    maxPrice: 299.99,
    targetMargin: 50,
    inventory: 8, // low inventory
    seasonalRelevance: 'All Year',
    status: 'Active',
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1)
  },
  {
    id: 'prod-5',
    sku: 'PP-OF-301',
    name: 'ErgoFlex Adjustable Desk Chair',
    categoryId: 'cat-4',
    brand: 'ErgoFlex',
    costPrice: 130.00,
    currentPrice: 299.99,
    minPrice: 220.00,
    maxPrice: 399.99,
    targetMargin: 40,
    inventory: 40,
    seasonalRelevance: 'All Year',
    status: 'Active',
    createdAt: daysAgo(120),
    updatedAt: daysAgo(10)
  },
  {
    id: 'prod-6',
    sku: 'PP-EL-003',
    name: 'Chromax 27" 4K Creator Monitor',
    categoryId: 'cat-1',
    brand: 'Chromax',
    costPrice: 180.00,
    currentPrice: 349.99,
    minPrice: 280.00,
    maxPrice: 449.99,
    targetMargin: 35,
    inventory: 15,
    seasonalRelevance: 'All Year',
    status: 'Active',
    createdAt: daysAgo(30),
    updatedAt: daysAgo(3)
  },
  {
    id: 'prod-7',
    sku: 'PP-HA-102',
    name: 'AromaMist Smart Humidifier',
    categoryId: 'cat-2',
    brand: 'AromaMist',
    costPrice: 15.00,
    currentPrice: 39.99,
    minPrice: 25.00,
    maxPrice: 59.99,
    targetMargin: 45,
    inventory: 90,
    seasonalRelevance: 'Winter', // seasonal relevance -> off-peak in summer
    status: 'Active',
    createdAt: daysAgo(100),
    updatedAt: daysAgo(15)
  }
];

export const INITIAL_COMPETITORS: Competitor[] = [
  { id: 'comp-1', name: 'MegaRetail Inc.', website: 'https://megaretail.com' },
  { id: 'comp-2', name: 'ElectroDirect', website: 'https://electrodirect.com' },
  { id: 'comp-3', name: 'FitLife Supply Co.', website: 'https://fitlifesupply.com' }
];

export const INITIAL_COMPETITOR_PRODUCTS: CompetitorProduct[] = [
  // AeroSound Pro ANC Headphones (prod-1)
  { id: 'cprod-1', productId: 'prod-1', competitorId: 'comp-1', competitorSku: 'MR-HP-909', url: 'https://megaretail.com/p/MR-HP-909' },
  { id: 'cprod-2', productId: 'prod-1', competitorId: 'comp-2', competitorSku: 'ED-AERO-ANC', url: 'https://electrodirect.com/p/ED-AERO-ANC' },

  // VoltCharge Pro 100W PowerBank (prod-2)
  { id: 'cprod-3', productId: 'prod-2', competitorId: 'comp-1', competitorSku: 'MR-PB-100W', url: 'https://megaretail.com/p/MR-PB-100W' },

  // SmartBreeze Tower Fan v2 (prod-3)
  { id: 'cprod-4', productId: 'prod-3', competitorId: 'comp-1', competitorSku: 'MR-FAN-V2', url: 'https://megaretail.com/p/MR-FAN-V2' },
  { id: 'cprod-5', productId: 'prod-3', competitorId: 'comp-2', competitorSku: 'ED-SMART-BREEZE', url: 'https://electrodirect.com/p/ED-SMART-BREEZE' },

  // TitanFit GPS Smartwatch (prod-4)
  { id: 'cprod-6', productId: 'prod-4', competitorId: 'comp-3', competitorSku: 'FL-TITAN-GPS', url: 'https://fitlifesupply.com/p/FL-TITAN-GPS' },

  // ErgoFlex Adjustable Desk Chair (prod-5)
  { id: 'cprod-7', productId: 'prod-5', competitorId: 'comp-1', competitorSku: 'MR-ERGO-CHAIR', url: 'https://megaretail.com/p/MR-ERGO-CHAIR' }
];

export const INITIAL_COMPETITOR_PRICE_SNAPSHOTS: CompetitorPriceSnapshot[] = [
  // AeroSound Pro ANC Headphones (prod-1)
  // MegaRetail (comp-1) prices: drop over time to squeeze us
  { id: 'cps-1', competitorProductId: 'cprod-1', price: 219.99, recordedAt: daysAgo(15) },
  { id: 'cps-2', competitorProductId: 'cprod-1', price: 209.99, recordedAt: daysAgo(7) },
  { id: 'cps-3', competitorProductId: 'cprod-1', price: 189.99, recordedAt: daysAgo(1) }, // competitor dropped price below our current $199.99!

  // ElectroDirect (comp-2) prices: stable
  { id: 'cps-4', competitorProductId: 'cprod-2', price: 204.99, recordedAt: daysAgo(10) },
  { id: 'cps-5', competitorProductId: 'cprod-2', price: 204.99, recordedAt: daysAgo(1) },

  // VoltCharge Pro 100W PowerBank (prod-2)
  // MegaRetail (comp-1) prices: very aggressive
  { id: 'cps-6', competitorProductId: 'cprod-3', price: 44.99, recordedAt: daysAgo(5) },
  { id: 'cps-7', competitorProductId: 'cprod-3', price: 42.99, recordedAt: daysAgo(1) }, // priced lower than us ($49.99)

  // SmartBreeze Tower Fan v2 (prod-3)
  { id: 'cps-8', competitorProductId: 'cprod-4', price: 104.99, recordedAt: daysAgo(10) },
  { id: 'cps-9', competitorProductId: 'cprod-4', price: 109.99, recordedAt: daysAgo(1) }, // competitor raised price (June summer peak!)
  { id: 'cps-10', competitorProductId: 'cprod-5', price: 105.00, recordedAt: daysAgo(1) },

  // TitanFit GPS Smartwatch (prod-4)
  { id: 'cps-11', competitorProductId: 'cprod-6', price: 259.99, recordedAt: daysAgo(8) },
  { id: 'cps-12', competitorProductId: 'cprod-6', price: 264.99, recordedAt: daysAgo(1) }, // competitor higher than us ($249.99)

  // ErgoFlex Adjustable Desk Chair (prod-5)
  { id: 'cps-13', competitorProductId: 'cprod-7', price: 289.99, recordedAt: daysAgo(12) },
  { id: 'cps-14', competitorProductId: 'cprod-7', price: 284.99, recordedAt: daysAgo(1) } // competitor slightly lower
];

export const INITIAL_BUSINESS_RULES: BusinessRule[] = [
  {
    id: 'rule-1',
    name: 'Absolute Minimum Margin Protection',
    code: 'MIN_MARGIN',
    type: 'margin',
    parameters: { minMarginPercent: 15.0 }, // Never allow pricing with < 15% margin
    isActive: true,
    updatedAt: daysAgo(30)
  },
  {
    id: 'rule-2',
    name: 'Competitor Corridor Constraint',
    code: 'COMPETITOR_CORRIDOR',
    type: 'competitor',
    parameters: { maxPremiumPercent: 10.0, maxDiscountPercent: 15.0 }, // Cap price within +10% or -15% of market average
    isActive: true,
    updatedAt: daysAgo(20)
  },
  {
    id: 'rule-3',
    name: 'Stock Scarcity Premium',
    code: 'STOCK_SCARCITY',
    type: 'inventory',
    parameters: { inventoryThreshold: 15, pricePremiumPercent: 12.0 }, // If stock < 15, increase price by 12% to capture scarcity value
    isActive: true,
    updatedAt: daysAgo(15)
  },
  {
    id: 'rule-4',
    name: 'High-Inventory Markdown',
    code: 'STOCK_SURPLUS',
    type: 'inventory',
    parameters: { inventoryThreshold: 100, priceDiscountPercent: 10.0 }, // If stock > 100, apply 10% markdown to liquidate
    isActive: true,
    updatedAt: daysAgo(15)
  },
  {
    id: 'rule-5',
    name: 'Seasonal Demand Adjustments',
    code: 'SEASONAL_BOOST',
    type: 'seasonal',
    parameters: { peakMultiplier: 1.10, offPeakMultiplier: 0.90 }, // +10% in peak, -10% in off-peak seasons
    isActive: true,
    updatedAt: daysAgo(25)
  }
];

// Generate simulated sales transactions for the past 30 days
export const generateInitialSalesTransactions = (): SalesTransaction[] => {
  const transactions: SalesTransaction[] = [];
  let txIdCounter = 1;

  // Let's generate daily or semi-daily sales for each product
  INITIAL_PRODUCTS.forEach(product => {
    // Determine base daily sales velocity (quantity sold)
    let baseVelocity = 2; // default units per transaction
    if (product.id === 'prod-2') baseVelocity = 5; // powerbank sells faster
    if (product.id === 'prod-5') baseVelocity = 1; // desk chair sells slower

    // Add seasonality multiplier
    const currentMonth = new Date().getMonth(); // June (5)
    let seasonalMultiplier = 1.0;
    if (product.seasonalRelevance === 'Summer') {
      seasonalMultiplier = 1.5; // sales volume increases in summer
    } else if (product.seasonalRelevance === 'Winter') {
      seasonalMultiplier = 0.6; // drops in summer
    }

    // Generate transactions for the last 30 days
    for (let day = 30; day >= 1; day--) {
      // Not every product sells every day
      const skipChance = product.id === 'prod-5' ? 0.6 : 0.2; // desk chairs sell less often
      if (Math.random() < skipChance) continue;

      // Quantity sold today (with random variance)
      const variance = Math.floor(Math.random() * 3) - 1; // -1, 0, 1, 2
      const quantity = Math.max(1, Math.round(baseVelocity * seasonalMultiplier) + variance);

      // Price sold (usually currentPrice, with slight historic promotion dips)
      let priceSold = product.currentPrice;
      if (day > 15 && Math.random() < 0.2) {
        priceSold = Math.round(product.currentPrice * 0.9 * 100) / 100; // 10% discount promo in the past
      }

      transactions.push({
        id: `tx-${txIdCounter++}`,
        productId: product.id,
        quantity,
        priceSold,
        revenue: Math.round(quantity * priceSold * 100) / 100,
        transactionDate: daysAgo(day)
      });
    }
  });

  return transactions;
};

export const INITIAL_SALES_TRANSACTIONS: SalesTransaction[] = generateInitialSalesTransactions();

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-1',
    userEmail: 'analyst@pricepilot.com',
    action: 'UPLOAD_CATALOG',
    details: 'Bulk catalog import completed. 7 items added/updated.',
    timestamp: daysAgo(5)
  },
  {
    id: 'log-2',
    userEmail: 'manager@pricepilot.com',
    action: 'ACTIVATE_RULE',
    details: 'Activated pricing rule: Stock Scarcity Premium (STOCK_SCARCITY)',
    timestamp: daysAgo(4)
  },
  {
    id: 'log-3',
    userEmail: 'admin@pricepilot.com',
    action: 'UPDATE_PRODUCT',
    details: 'Updated price bounds for SKU PP-EL-001 (AeroSound Pro ANC Headphones). Min: ₹120.00, Max: ₹249.99.',
    timestamp: daysAgo(2)
  },
  {
    id: 'log-4',
    userEmail: 'manager@pricepilot.com',
    action: 'APPROVE_RECOMMENDATION',
    details: 'Approved price recommendation for SKU PP-EL-003. Price updated from ₹359.99 to ₹349.99.',
    timestamp: daysAgo(1)
  }
];

export const INITIAL_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-1',
    title: 'Competitor Price Cut Detected',
    message: 'MegaRetail Inc. dropped the price for AeroSound Pro ANC Headphones to ₹189.99 (was ₹209.99), creating a ₹10.00 price deficit.',
    type: 'competitor',
    isRead: false,
    createdAt: daysAgo(1)
  },
  {
    id: 'notif-2',
    title: 'Margin Protection Alert',
    message: 'TitanFit GPS Smartwatch margin is at 56%, but low stock premium of 12% is suggested because inventory is at 8 units.',
    type: 'margin',
    isRead: false,
    createdAt: daysAgo(1)
  },
  {
    id: 'notif-3',
    title: 'Low Inventory Warning',
    message: 'Product "AeroSound Pro ANC Headphones" (PP-EL-001) has fallen below safety stock level. Current quantity: 12 units.',
    type: 'stock',
    isRead: true,
    createdAt: daysAgo(2)
  },
  {
    id: 'notif-4',
    title: 'High Stock Level Alert',
    message: 'Product "VoltCharge Pro 100W PowerBank" (PP-EL-002) inventory is high (140 units). Suggested markdown of 10% to speed up velocity.',
    type: 'stock',
    isRead: false,
    createdAt: daysAgo(1)
  }
];

// We will pre-generate a few pending and approved price recommendations
export const INITIAL_RECOMMENDATIONS: PriceRecommendation[] = [
  {
    id: 'rec-1',
    productId: 'prod-1',
    suggestedPrice: 194.99,
    minSuggestedPrice: 169.99,
    maxSuggestedPrice: 219.99,
    predictedDemand: 45,
    confidenceScore: 88.0,
    marginEstimate: 104.99,
    revenueEstimate: 8774.55,
    explanation: {
      factors: [
        'MegaRetail dropped price to ₹189.99, leading to pricing pressure.',
        'Inventory is low (12 units), supporting a 12% scarcity premium.',
        'Preserves margin above 50%.'
      ],
      summary: 'Aggressive pricing behavior by competitor A requires a slight downward adjustment to maintain volume, but low inventory buffers the descent.'
    },
    status: 'Pending',
    createdAt: daysAgo(1)
  },
  {
    id: 'rec-2',
    productId: 'prod-2',
    suggestedPrice: 44.99,
    minSuggestedPrice: 39.99,
    maxSuggestedPrice: 49.99,
    predictedDemand: 120,
    confidenceScore: 82.0,
    marginEstimate: 22.99,
    revenueEstimate: 5398.80,
    explanation: {
      factors: [
        'Stock level is high (140 units), triggering 10% liquidation discount.',
        'MegaRetail is pricing at ₹42.99, creating a pricing gap.'
      ],
      summary: 'Suggesting a markdown to ₹44.99 to clear surplus inventory and match competitor discount levels, driving transaction velocity.'
    },
    status: 'Pending',
    createdAt: daysAgo(1)
  },
  {
    id: 'rec-3',
    productId: 'prod-3',
    suggestedPrice: 108.99,
    minSuggestedPrice: 99.99,
    maxSuggestedPrice: 119.99,
    predictedDemand: 85,
    confidenceScore: 91.0,
    marginEstimate: 63.99,
    revenueEstimate: 9264.15,
    explanation: {
      factors: [
        'Summer seasonal boost of +10% is active.',
        'Competitor price average increased by 6% to ₹107.50.'
      ],
      summary: 'Upward adjustment suggested based on peak summer seasonality and rising competitor averages, maximizing capture margins.'
    },
    status: 'Pending',
    createdAt: daysAgo(1)
  }
];
