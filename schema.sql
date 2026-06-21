-- PricePilot PostgreSQL DDL Schema
-- Copy and execute this code in the Supabase SQL editor to initialize tables.

-- Drop tables if they already exist
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS sales_transactions CASCADE;
DROP TABLE IF EXISTS price_recommendations CASCADE;
DROP TABLE IF EXISTS business_rules CASCADE;
DROP TABLE IF EXISTS competitor_price_snapshots CASCADE;
DROP TABLE IF EXISTS competitor_products CASCADE;
DROP TABLE IF EXISTS competitors CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 0. User Profiles (For Custom Email/Password Sign Up)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'Pricing Analyst', -- 'Admin', 'Pricing Analyst', 'Manager', 'Viewer'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Core Catalog Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Categories
INSERT INTO categories (id, name, description) VALUES
('cat-1', 'Consumer Electronics', 'Smartphones, laptops, accessories, and audio gear'),
('cat-2', 'Home Appliances', 'Smart devices, kitchenware, and climate control'),
('cat-3', 'Fitness Gear', 'Wearables, exercise equipment, and apparel'),
('cat-4', 'Office Furniture', 'Ergonomic chairs, desks, and office supplies');

-- 2. Core Catalog Products
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand VARCHAR(100),
  cost_price DECIMAL(12, 2) NOT NULL,
  current_price DECIMAL(12, 2) NOT NULL,
  min_price DECIMAL(12, 2) NOT NULL,
  max_price DECIMAL(12, 2) NOT NULL,
  target_margin DECIMAL(5, 2) NOT NULL, -- e.g. 35.00 for 35% margin
  inventory INT NOT NULL DEFAULT 0,
  seasonal_relevance VARCHAR(50) DEFAULT 'All Year', -- e.g., 'Summer', 'Winter'
  status VARCHAR(20) DEFAULT 'Active', -- 'Active', 'Draft', 'Archived'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index SKU
CREATE INDEX idx_products_sku ON products(sku);

-- 3. Competitor Intelligence
CREATE TABLE competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  website VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE competitor_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  competitor_id UUID REFERENCES competitors(id) ON DELETE CASCADE,
  competitor_sku VARCHAR(100),
  url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, competitor_id)
);

CREATE TABLE competitor_price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_product_id UUID REFERENCES competitor_products(id) ON DELETE CASCADE,
  price DECIMAL(12, 2) NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_competitor_price_snapshots_recorded ON competitor_price_snapshots(recorded_at DESC);

-- 4. Pricing Rules Engine
CREATE TABLE business_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'MIN_MARGIN', 'STOCK_SCARCITY'
  type VARCHAR(20) NOT NULL, -- 'margin', 'competitor', 'inventory', 'seasonal'
  parameters JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Recommendations & Approvals Workflows
CREATE TABLE price_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  suggested_price DECIMAL(12, 2) NOT NULL,
  min_suggested_price DECIMAL(12, 2) NOT NULL,
  max_suggested_price DECIMAL(12, 2) NOT NULL,
  predicted_demand INT NOT NULL,
  confidence_score DECIMAL(5, 2) NOT NULL,
  margin_estimate DECIMAL(12, 2) NOT NULL,
  revenue_estimate DECIMAL(12, 2) NOT NULL,
  explanation JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'Pending', -- 'Pending', 'Approved', 'Rejected'
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_by VARCHAR(100),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_recommendations_product ON price_recommendations(product_id);
CREATE INDEX idx_recommendations_status ON price_recommendations(status);

-- 6. Sales Transactions (Historical Sales data for forecasting models)
CREATE TABLE sales_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INT NOT NULL,
  price_sold DECIMAL(12, 2) NOT NULL,
  revenue DECIMAL(12, 2) NOT NULL,
  transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sales_transactions_date ON sales_transactions(transaction_date);

-- 7. Audit Logging
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- 8. Real-time Notifications & Alerts
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'competitor', 'stock', 'margin', 'system'
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
