const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      process.env[key] = val;
    }
  }
}

const { db } = require('./src/lib/db');
const { ScraperService } = require('./src/services/ScraperService');

async function sync() {
  console.log('--- SYNCING COMPETITOR FEEDS TO DATABASE ---');
  try {
    const products = await db.getProducts();
    const competitors = await db.getCompetitors();
    const existingFeeds = await db.getCompetitorProducts();
    
    console.log(`Found ${products.length} products, ${competitors.length} competitors, and ${existingFeeds.length} existing feeds.`);
    
    const amazonComp = competitors.find(c => c.name.toLowerCase().includes('amazon'));
    const flipkartComp = competitors.find(c => c.name.toLowerCase().includes('flipkart'));
    const cromaComp = competitors.find(c => c.name.toLowerCase().includes('croma'));
    const relianceComp = competitors.find(c => c.name.toLowerCase().includes('reliance'));
    const vijayComp = competitors.find(c => c.name.toLowerCase().includes('vijay'));
    
    for (const product of products) {
      console.log(`\nProcessing product: "${product.name}" (SKU: ${product.sku})...`);
      
      const searchQuery = product.brand && !product.name.toLowerCase().includes(product.brand.toLowerCase())
        ? `${product.brand} ${product.name}`
        : product.name;
        
      console.log(`Searching URLs for query: "${searchQuery}"`);
      const resolved = await ScraperService.findCompetitorUrls(searchQuery);
      
      const addFeed = async (comp, url) => {
        if (!comp || !url) return;
        
        // Check if feed already exists
        const exists = existingFeeds.some(f => f.productId === product.id && f.competitorId === comp.id);
        if (exists) {
          console.log(`Feed for ${comp.name} already exists for this product. Skipping feed creation.`);
          return;
        }
        
        try {
          const skuPrefix = comp.name.split(' ')[0].substring(0, 3).toUpperCase();
          const competitorSku = `${skuPrefix}-${product.sku}`;
          
          console.log(`Adding feed for ${comp.name}: ${url}`);
          const cp = await db.addCompetitorProduct({
            productId: product.id,
            competitorId: comp.id,
            competitorSku,
            url
          });
          
          console.log(`Scraping initial price for ${comp.name}...`);
          const price = await ScraperService.scrapePriceWithFallback(url, product.name);
          
          if (price !== null && !isNaN(price)) {
            await db.addCompetitorPriceSnapshot({
              competitorProductId: cp.id,
              price
            });
            console.log(`Successfully saved price: ₹${price} for ${comp.name}`);
          }
        } catch (err) {
          console.error(`Error adding feed for ${comp.name}:`, err.message);
        }
      };
      
      await addFeed(amazonComp, resolved.amazon);
      await addFeed(flipkartComp, resolved.flipkart);
      await addFeed(cromaComp, resolved.croma);
      await addFeed(relianceComp, resolved.reliance);
      await addFeed(vijayComp, resolved.vijaysales);
    }
    console.log('\n--- SYNC COMPLETED ---');
  } catch (error) {
    console.error('Sync failed:', error.message);
  }
}

sync();
