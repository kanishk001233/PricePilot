# PricePilot - Enterprise Pricing Intelligence Dashboard

PricePilot is an enterprise-grade full-stack SaaS application designed for pricing analysts, product managers, and business owners. It provides automated demand forecasting, competitor tracking, margins protection rules, and role-based recommendation approval workflows.

---

## Technical Stack
- **Frontend**: React 18+ (Next.js 14+ App Router), TypeScript, Tailwind CSS, Recharts, Framer Motion, Lucide Icons.
- **Backend**: Next.js Serverless API routes (with service/controller structure), JSONWebToken session handling.
- **Database**: PostgreSQL (via Supabase) with automatic sandbox fallback to a local JSON file (`src/data/local_db.json`) for zero-setup execution.

---

## Quick Start (Local Setup)

### 1. Install Dependencies
Run the following command at the root of the project to install all package requirements:
```bash
npm install
```

### 2. Start the Development Server
Launch the development server:
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---



> [!TIP]
> **Real-time Role Switcher**: A dropdown is embedded in the header menu bar during development mode. It allows you to toggle the active session role with a single click to easily test different user perspectives without logging out and back in.

---

## Production Database: Supabase Setup

To switch from the local JSON database sandbox to a live PostgreSQL production database:

1. **Deploy DDL Tables**: Execute the SQL DDL commands inside **[schema.sql](file:///c:/Users/Lenovo/Desktop/PricePilot/schema.sql)** in the Supabase SQL editor.
2. **Configure Environment Variables**: Create a `.env.local` file at the root of the project and populate the keys:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-string
   JWT_SECRET=pricepilot-secure-key-string
   ```
   *Note: If these credentials are blank, PricePilot automatically falls back to local file storage, preserving database edits across page reloads.*

---

## Key Features

1. **Demand Forecasting (Price Elasticity)**: Measures sales trends using a coefficient of demand elasticity ($\epsilon = -1.5$). Simulating price adjustments projects corresponding units volume shifts and revenue variances.
2. **Rules Engine Optimization**: Adjust parameters for:
   - *Absolute Minimum Margin Floor*: Clamps final price suggestions to protect margin floors.
   - *Competitor Corridor*: Restricts prices from exceeding or under-cutting competitor averages.
   - *Stock Scarcity Premium / High Stock Markdown*: Automatically adjusts suggestions based on stock pressure.
   - *Seasonal Peak Boost*: Applies peak/off-peak adjustments based on current date.
3. **Competitor Intelligence Feed**: Compares prices side-by-side and draws historical pricing sparklines. Tapping **Sync Market** in the header simulates an automated scraper feed and triggers notifications if competitors under-cut our price.
4. **Audit Logs Trail**: Complete system logging of logins, rule updates, approvals, and catalog changes.
