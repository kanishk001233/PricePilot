import { NextRequest, NextResponse } from 'next/server';
import { db, supabase } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const diagnostic: Record<string, any> = {
      timestamp: new Date().toISOString(),
      supabaseConfigured: !!supabase,
      env: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Configured (starts with ' + process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 15) + ')' : 'Not Set',
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Configured (length: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'Not Set',
        browserlessKey: process.env.NEXT_PUBLIC_BROWSERLESS_API_KEY ? 'Configured' : (process.env.BROWSERLESS_API_KEY ? 'Configured (non-public)' : 'Not Set')
      },
      tables: {}
    };

    if (supabase) {
      const tablesToCheck = ['users', 'categories', 'products', 'competitors', 'competitor_products', 'competitor_price_snapshots', 'business_rules', 'price_recommendations', 'sales_transactions', 'audit_logs', 'notifications'];
      
      for (const table of tablesToCheck) {
        try {
          const { data, error } = await supabase.from(table).select('count').limit(1);
          if (error) {
            diagnostic.tables[table] = { status: 'Error', message: error.message };
          } else {
            diagnostic.tables[table] = { status: 'Exists' };
          }
        } catch (e: any) {
          diagnostic.tables[table] = { status: 'Crash', message: e.message };
        }
      }
    }

    return NextResponse.json(diagnostic);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
