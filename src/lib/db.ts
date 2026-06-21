import { createClient } from '@supabase/supabase-js';
import * as seed from './seedData';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Helper to throw a configuration error if database keys are missing
function ensureDB() {
  if (!supabase) {
    throw new Error('Database Connection Error: Missing database credentials. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables to connect.');
  }
}

export const db = {
  isLocal: false,

  // --- Categories ---
  async getCategories(): Promise<seed.Category[]> {
    ensureDB();
    const { data, error } = await supabase!.from('categories').select('*');
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return data || [];
  },

  async createCategory(name: string, description?: string): Promise<seed.Category> {
    ensureDB();
    const insertPayload: Record<string, any> = { name };
    if (description !== undefined && description !== null) {
      insertPayload.description = description;
    }
    const { data, error } = await supabase!
      .from('categories')
      .insert(insertPayload)
      .select()
      .single();
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return data;
  },

  async getProducts(): Promise<seed.Product[]> {
    ensureDB();
    const { data, error } = await supabase!.from('products').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return (data || []).map((p: any) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      categoryId: p.category_id,
      brand: p.brand,
      costPrice: Number(p.cost_price),
      currentPrice: Number(p.current_price),
      minPrice: Number(p.min_price),
      maxPrice: Number(p.max_price),
      targetMargin: Number(p.target_margin),
      inventory: p.inventory,
      seasonalRelevance: p.seasonal_relevance,
      status: p.status,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }));
  },

  async getProductById(id: string): Promise<seed.Product | null> {
    const products = await this.getProducts();
    return products.find(p => p.id === id) || null;
  },

  async updateProduct(id: string, updates: Partial<seed.Product>): Promise<seed.Product | null> {
    ensureDB();
    const pgUpdates: Record<string, any> = {};
    if (updates.sku !== undefined) pgUpdates.sku = updates.sku;
    if (updates.name !== undefined) pgUpdates.name = updates.name;
    if (updates.categoryId !== undefined) pgUpdates.category_id = updates.categoryId;
    if (updates.brand !== undefined) pgUpdates.brand = updates.brand;
    if (updates.costPrice !== undefined) pgUpdates.cost_price = updates.costPrice;
    if (updates.currentPrice !== undefined) pgUpdates.current_price = updates.currentPrice;
    if (updates.minPrice !== undefined) pgUpdates.min_price = updates.minPrice;
    if (updates.maxPrice !== undefined) pgUpdates.max_price = updates.maxPrice;
    if (updates.targetMargin !== undefined) pgUpdates.target_margin = updates.targetMargin;
    if (updates.inventory !== undefined) pgUpdates.inventory = updates.inventory;
    if (updates.seasonalRelevance !== undefined) pgUpdates.seasonal_relevance = updates.seasonalRelevance;
    if (updates.status !== undefined) pgUpdates.status = updates.status;
    pgUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase!.from('products').update(pgUpdates).eq('id', id).select().single();
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    
    return data ? {
      id: data.id,
      sku: data.sku,
      name: data.name,
      categoryId: data.category_id,
      brand: data.brand,
      costPrice: Number(data.cost_price),
      currentPrice: Number(data.current_price),
      minPrice: Number(data.min_price),
      maxPrice: Number(data.max_price),
      targetMargin: Number(data.target_margin),
      inventory: data.inventory,
      seasonalRelevance: data.seasonal_relevance,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    } : null;
  },

  async createProduct(product: Omit<seed.Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<seed.Product> {
    ensureDB();
    const pgProduct = {
      sku: product.sku,
      name: product.name,
      category_id: product.categoryId,
      brand: product.brand,
      cost_price: product.costPrice,
      current_price: product.currentPrice,
      min_price: product.minPrice,
      max_price: product.maxPrice,
      target_margin: product.targetMargin,
      inventory: product.inventory,
      seasonal_relevance: product.seasonalRelevance,
      status: product.status || 'Active'
    };

    const { data, error } = await supabase!.from('products').insert(pgProduct).select().single();
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    
    return {
      id: data.id,
      sku: data.sku,
      name: data.name,
      categoryId: data.category_id,
      brand: data.brand,
      costPrice: Number(data.cost_price),
      currentPrice: Number(data.current_price),
      minPrice: Number(data.min_price),
      maxPrice: Number(data.max_price),
      targetMargin: Number(data.target_margin),
      inventory: data.inventory,
      seasonalRelevance: data.seasonal_relevance,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  },

  async deleteProduct(id: string): Promise<boolean> {
    ensureDB();
    const { error } = await supabase!.from('products').delete().eq('id', id);
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return true;
  },

  // --- Competitors & Competitor Pricing ---
  async addCompetitor(name: string, website: string): Promise<any> {
    ensureDB();
    const { data, error } = await supabase!.from('competitors').insert({
      name,
      website
    }).select().single();
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return data;
  },

  async getCompetitors(): Promise<seed.Competitor[]> {
    ensureDB();
    const { data, error } = await supabase!.from('competitors').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return data || [];
  },

  async getCompetitorProducts(): Promise<any[]> {
    ensureDB();
    const { data, error } = await supabase!.from('competitor_products').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return (data || []).map((cp: any) => {
      const parts = cp.url ? cp.url.split('||') : [];
      return {
        id: cp.id,
        productId: cp.product_id,
        competitorId: cp.competitor_id,
        competitorSku: cp.competitor_sku,
        url: parts[0] || null,
        title: parts[1] || null
      };
    });
  },

  async getCompetitorPriceSnapshots(): Promise<seed.CompetitorPriceSnapshot[]> {
    ensureDB();
    const { data, error } = await supabase!.from('competitor_price_snapshots').select('*');
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return (data || []).map((cps: any) => ({
      id: cps.id,
      competitorProductId: cps.competitor_product_id,
      price: Number(cps.price),
      recordedAt: cps.recorded_at
    }));
  },

  async getLatestCompetitorPriceSnapshot(competitorProductId: string): Promise<seed.CompetitorPriceSnapshot | null> {
    ensureDB();
    const { data, error } = await supabase!
      .from('competitor_price_snapshots')
      .select('*')
      .eq('competitor_product_id', competitorProductId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    if (!data) return null;
    return {
      id: data.id,
      competitorProductId: data.competitor_product_id,
      price: Number(data.price),
      recordedAt: data.recorded_at
    };
  },

  async addCompetitorProduct(prod: { productId: string; competitorId: string; competitorSku: string; url: string | null; title?: string | null }): Promise<any> {
    ensureDB();
    const storedUrl = prod.title ? `${prod.url}||${prod.title}` : prod.url;
    const { data, error } = await supabase!.from('competitor_products').insert({
      product_id: prod.productId,
      competitor_id: prod.competitorId,
      competitor_sku: prod.competitorSku,
      url: storedUrl
    }).select().single();
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    const parts = data.url ? data.url.split('||') : [];
    return {
      id: data.id,
      productId: data.product_id,
      competitorId: data.competitor_id,
      competitorSku: data.competitor_sku,
      url: parts[0] || null,
      title: parts[1] || null
    };
  },

  async updateCompetitorProduct(id: string, updates: { url?: string | null; title?: string | null }): Promise<boolean> {
    ensureDB();
    let storedUrl = updates.url;
    if (updates.url && updates.title) {
      storedUrl = `${updates.url}||${updates.title}`;
    }
    const { error } = await supabase!.from('competitor_products').update({ url: storedUrl }).eq('id', id);
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return true;
  },

  async deleteCompetitorProduct(id: string): Promise<boolean> {
    ensureDB();
    const { error } = await supabase!.from('competitor_products').delete().eq('id', id);
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return true;
  },

  async addCompetitorPriceSnapshot(snapshot: Omit<seed.CompetitorPriceSnapshot, 'id' | 'recordedAt'>): Promise<seed.CompetitorPriceSnapshot> {
    ensureDB();
    const { data, error } = await supabase!.from('competitor_price_snapshots').insert({
      competitor_product_id: snapshot.competitorProductId,
      price: snapshot.price
    }).select().single();
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    
    return {
      id: data.id,
      competitorProductId: data.competitor_product_id,
      price: Number(data.price),
      recordedAt: data.recorded_at
    };
  },

  // --- Business Rules ---
  async getBusinessRules(): Promise<seed.BusinessRule[]> {
    ensureDB();
    const { data, error } = await supabase!.from('business_rules').select('*');
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      type: r.type,
      parameters: r.parameters,
      isActive: r.is_active,
      updatedAt: r.updated_at
    }));
  },

  async updateBusinessRule(id: string, updates: Partial<seed.BusinessRule>): Promise<seed.BusinessRule | null> {
    ensureDB();
    const pgUpdates: Record<string, any> = {};
    if (updates.name !== undefined) pgUpdates.name = updates.name;
    if (updates.isActive !== undefined) pgUpdates.is_active = updates.isActive;
    if (updates.parameters !== undefined) pgUpdates.parameters = updates.parameters;
    pgUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase!.from('business_rules').update(pgUpdates).eq('id', id).select().single();
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    
    return data ? {
      id: data.id,
      name: data.name,
      code: data.code,
      type: data.type,
      parameters: data.parameters,
      isActive: data.is_active,
      updatedAt: data.updated_at
    } : null;
  },

  // --- Sales Transactions ---
  async getSalesTransactions(): Promise<seed.SalesTransaction[]> {
    ensureDB();
    const { data, error } = await supabase!.from('sales_transactions').select('*');
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return (data || []).map((t: any) => ({
      id: t.id,
      productId: t.product_id,
      quantity: t.quantity,
      priceSold: Number(t.price_sold),
      revenue: Number(t.revenue),
      customerName: t.customer_name,
      customerPhone: t.customer_phone,
      customerEmail: t.customer_email,
      cashierEmail: t.cashier_email,
      transactionDate: t.transaction_date,
      returned: !!t.returned
    }));
  },

  async recordSale(sale: Omit<seed.SalesTransaction, 'id' | 'transactionDate' | 'returned'>): Promise<seed.SalesTransaction> {
    ensureDB();
    const { data, error } = await supabase!.from('sales_transactions').insert({
      product_id: sale.productId,
      quantity: sale.quantity,
      price_sold: sale.priceSold,
      revenue: sale.revenue,
      customer_name: sale.customerName,
      customer_phone: sale.customerPhone,
      customer_email: sale.customerEmail,
      cashier_email: sale.cashierEmail
    }).select().single();
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    
    return {
      id: data.id,
      productId: data.product_id,
      quantity: data.quantity,
      priceSold: Number(data.price_sold),
      revenue: Number(data.revenue),
      customerName: data.customer_name,
      customerPhone: data.customer_phone,
      customerEmail: data.customer_email,
      cashierEmail: data.cashier_email,
      transactionDate: data.transaction_date,
      returned: !!data.returned
    };
  },

  async returnSale(transactionId: string): Promise<boolean> {
    ensureDB();
    const { error } = await supabase!
      .from('sales_transactions')
      .update({ returned: true })
      .eq('id', transactionId);
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return true;
  },

  // --- Price Recommendations ---
  async getRecommendations(): Promise<seed.PriceRecommendation[]> {
    ensureDB();
    const { data, error } = await supabase!.from('price_recommendations').select('*');
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return (data || []).map((r: any) => ({
      id: r.id,
      productId: r.product_id,
      suggestedPrice: Number(r.suggested_price),
      minSuggestedPrice: Number(r.min_suggested_price),
      maxSuggestedPrice: Number(r.max_suggested_price),
      predictedDemand: r.predicted_demand,
      confidenceScore: Number(r.confidence_score),
      marginEstimate: Number(r.margin_estimate),
      revenueEstimate: Number(r.revenue_estimate),
      explanation: r.explanation,
      status: r.status,
      notes: r.notes,
      createdAt: r.created_at,
      processedBy: r.processed_by,
      processedAt: r.processed_at
    }));
  },

  async createRecommendation(rec: Omit<seed.PriceRecommendation, 'id' | 'createdAt' | 'status'>): Promise<seed.PriceRecommendation> {
    ensureDB();
    const pgRec = {
      product_id: rec.productId,
      suggested_price: rec.suggestedPrice,
      min_suggested_price: rec.minSuggestedPrice,
      max_suggested_price: rec.maxSuggestedPrice,
      predicted_demand: rec.predictedDemand,
      confidence_score: rec.confidenceScore,
      margin_estimate: rec.marginEstimate,
      revenue_estimate: rec.revenueEstimate,
      explanation: rec.explanation,
      status: 'Pending'
    };

    const { data, error } = await supabase!.from('price_recommendations').insert(pgRec).select().single();
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    
    return {
      id: data.id,
      productId: data.product_id,
      suggestedPrice: Number(data.suggested_price),
      minSuggestedPrice: Number(data.min_suggested_price),
      maxSuggestedPrice: Number(data.max_suggested_price),
      predictedDemand: data.predicted_demand,
      confidenceScore: Number(data.confidence_score),
      marginEstimate: Number(data.margin_estimate),
      revenueEstimate: Number(data.revenue_estimate),
      explanation: data.explanation,
      status: data.status,
      notes: data.notes,
      createdAt: data.created_at,
      processedBy: data.processed_by,
      processedAt: data.processed_at
    };
  },

  async updateRecommendationStatus(id: string, status: 'Approved' | 'Rejected', processedBy: string, notes?: string): Promise<seed.PriceRecommendation | null> {
    ensureDB();
    const now = new Date().toISOString();
    
    const { data, error } = await supabase!
      .from('price_recommendations')
      .update({
        status,
        processed_by: processedBy,
        processed_at: now,
        notes: notes || null
      })
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);

    if (data) {
      if (status === 'Approved') {
        await this.updateProduct(data.product_id, { currentPrice: Number(data.suggested_price) });
      }
      
      return {
        id: data.id,
        productId: data.product_id,
        suggestedPrice: Number(data.suggested_price),
        minSuggestedPrice: Number(data.min_suggested_price),
        maxSuggestedPrice: Number(data.max_suggested_price),
        predictedDemand: data.predicted_demand,
        confidenceScore: Number(data.confidence_score),
        marginEstimate: Number(data.margin_estimate),
        revenueEstimate: Number(data.revenue_estimate),
        explanation: data.explanation,
        status: data.status,
        notes: data.notes,
        createdAt: data.created_at,
        processedBy: data.processed_by,
        processedAt: data.processed_at
      };
    }
    return null;
  },

  async deleteRecommendation(id: string): Promise<boolean> {
    ensureDB();
    const { error } = await supabase!
      .from('price_recommendations')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return true;
  },

  // --- Audit Logs ---
  async getAuditLogs(): Promise<seed.AuditLog[]> {
    ensureDB();
    const { data, error } = await supabase!
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false });
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return (data || []).map((l: any) => ({
      id: l.id,
      userEmail: l.user_email,
      action: l.action,
      details: l.details,
      timestamp: l.timestamp
    }));
  },

  async logAction(userEmail: string, action: string, details: string): Promise<seed.AuditLog> {
    ensureDB();
    const { data, error } = await supabase!.from('audit_logs').insert({
      user_email: userEmail,
      action,
      details
    }).select().single();
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    
    return {
      id: data.id,
      userEmail: data.user_email,
      action: data.action,
      details: data.details,
      timestamp: data.timestamp
    };
  },

  // --- Notifications ---
  async getNotifications(): Promise<seed.Notification[]> {
    if (!supabase) {
      // Return unconfigured alert notification to user
      return [{
        id: 'db-config-error',
        title: 'Database Connection Missing',
        message: 'The live Supabase PostgreSQL database is not connected. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables.',
        type: 'margin',
        isRead: false,
        createdAt: new Date().toISOString()
      }];
    }
    const { data, error } = await supabase.from('notifications').select('*');
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return (data || []).map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.is_read,
      createdAt: n.created_at
    }));
  },

  async markNotificationRead(id: string): Promise<boolean> {
    ensureDB();
    const { error } = await supabase!.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return true;
  },

  async addNotification(title: string, message: string, type: 'competitor' | 'stock' | 'margin' | 'system'): Promise<seed.Notification> {
    ensureDB();
    const { data, error } = await supabase!.from('notifications').insert({
      title,
      message,
      type,
      is_read: false
    }).select().single();
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    
    return {
      id: data.id,
      title: data.title,
      message: data.message,
      type: data.type,
      isRead: data.is_read,
      createdAt: data.created_at
    };
  },

  // --- Users & Register ---
  async getUserByEmail(email: string): Promise<any | null> {
    ensureDB();
    const { data, error } = await supabase!.from('users').select('*').eq('email', email).maybeSingle();
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return data;
  },

  async createUser(email: string, passwordHash: string, name: string, role: string): Promise<any> {
    ensureDB();
    const { data, error } = await supabase!.from('users').insert({
      email,
      password_hash: passwordHash,
      name,
      role
    }).select().single();
    if (error) throw new Error(`PostgreSQL Database Error: ${error.message}`);
    return data;
  }
};

// Background Scheduler: runs every 1 hour (3,600,000 milliseconds)
if (typeof global !== 'undefined' && !(global as any)._pricePilotSchedulerStarted) {
  (global as any)._pricePilotSchedulerStarted = true;
  console.log('[Scheduler] Initializing background competitor price scraping queue...');
  
  const HOURLY_INTERVAL = 3600000;
  
  setInterval(async () => {
    console.log('[Scheduler] Starting hourly background competitor price sync...');
    try {
      // Dynamic import of ScraperService to avoid load-time circular references
      const { ScraperService } = await import('../services/ScraperService');
      
      const products = await db.getProducts();
      const competitorProducts = await db.getCompetitorProducts();
      const competitors = await db.getCompetitors();
      
      if (competitorProducts.length === 0) {
        console.log('[Scheduler] No competitor products tracked. Skipping...');
        return;
      }
      
      console.log(`[Scheduler] Scraper queue processing ${competitorProducts.length} feeds...`);
      for (const cp of competitorProducts) {
        const product = products.find(p => p.id === cp.productId);
        const comp = competitors.find(c => c.id === cp.competitorId);
        
        if (!product || !cp.url) continue;
        const compName = comp ? comp.name : 'Competitor';
        try {
          console.log(`[Scheduler] Scraping ${compName} URL for product: "${product.name}"`);
          const { price, title } = await ScraperService.scrapePriceWithFallback(cp.url, product.name);
          
          if (title && cp.title !== title) {
            await db.updateCompetitorProduct(cp.id, { url: cp.url, title });
            cp.title = title;
          }
          
          if (price !== null && !isNaN(price)) {
            // Check if price changed from the latest snapshot before saving new one
            const latestSnapshot = await db.getLatestCompetitorPriceSnapshot(cp.id);
            const priceChanged = !latestSnapshot || latestSnapshot.price !== price;

            // Save price snapshot
            const snapshot = await db.addCompetitorPriceSnapshot({
              competitorProductId: cp.id,
              price
            });
            console.log(`[Scheduler] Saved price snapshot: ₹${price} for ${product.name} (${compName})`);
            
            // Trigger alert if competitor drops below our current price AND the price actually changed
            if (price < product.currentPrice && priceChanged) {
              const diff = product.currentPrice - price;
              await db.addNotification(
                'Competitor Price Under-cutting',
                `Competitor "${compName}" is now pricing "${product.name}" at ₹${price.toFixed(2)}, which is ₹${diff.toFixed(2)} cheaper than our price of ₹${product.currentPrice.toFixed(2)}.`,
                'competitor'
              );
            }
          } else {
            console.warn(`[Scheduler] Failed to scrape price for "${product.name}" on ${compName} (price null).`);
          }
        } catch (err: any) {
          console.error(`[Scheduler] Error scraping feed for "${product.name}" on ${compName}:`, err.message);
        }
      }
      console.log('[Scheduler] Hourly background competitor price sync completed.');
    } catch (e: any) {
      console.error('[Scheduler] Background price sync failed:', e.message);
    }
  }, HOURLY_INTERVAL);
}

