import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseAnonKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = val;
    }
  }
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing from .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function wipe() {
  console.log('Connecting to Supabase at:', supabaseUrl);
  console.log('Beginning database wipe (Option B)...');

  try {
    // Delete in child-to-parent order to avoid foreign key violations
    console.log('Deleting notifications...');
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting audit logs...');
    await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting sales transactions...');
    await supabase.from('sales_transactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting price recommendations...');
    await supabase.from('price_recommendations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting business rules...');
    await supabase.from('business_rules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting competitor price snapshots...');
    await supabase.from('competitor_price_snapshots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting competitor products...');
    await supabase.from('competitor_products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting competitors...');
    await supabase.from('competitors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('Deleting products...');
    await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Note: We leave categories intact so they are ready for the user to assign products to.
    console.log('Keeping categories intact.');

    console.log('\n=========================================');
    console.log('Database wiped successfully! Your catalog and dashboard are now empty and ready for your data.');
    console.log('=========================================');

  } catch (error: any) {
    console.error('Wiping process failed with error:', error.message || error);
    process.exit(1);
  }
}

wipe();
