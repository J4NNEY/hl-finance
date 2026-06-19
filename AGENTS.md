<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# HL Finance - Agent Guide

## Quick Reference

```bash
npm run dev          # Dev server (http://localhost:3000)
npm run build        # Production build (runs typecheck)
npm run lint         # ESLint
```

**Important:** No `typecheck` script exists. Use `npx tsc --noEmit` directly.

## Architecture

**Framework:** Next.js 16 (App Router) + React 19 + TypeScript
**Database:** Supabase (PostgreSQL) with RLS enabled
**UI:** Shadcn/ui (base-nova style) + Tailwind CSS v4
**Auth:** Supabase Auth (single-user, no registration)

### Route Structure

```
src/app/
├── (auth)/login/           # Login page (unauthenticated)
└── (dashboard)/            # Protected pages (requires auth)
    ├── page.tsx            # Dashboard/beranda
    ├── customers/
    │   ├── page.tsx        # Customer list
    │   └── [id]/page.tsx   # Customer detail
    ├── products/page.tsx   # Product list
    ├── transactions/
    │   ├── page.tsx        # Transaction list
    │   ├── new/page.tsx    # Create transaction
    │   └── [id]/page.tsx   # Transaction detail
    └── reports/page.tsx    # Reports
```

### Key Files

- `src/proxy.ts` - Auth guard, security headers, rate limiting (was `middleware.ts` in older Next.js)
- `src/lib/supabase/client.ts` - Browser Supabase client
- `src/lib/supabase/server.ts` - Server Supabase client (uses cookies)
- `src/lib/utils/currency.ts` - All financial calculations (uses decimal.js)
- `src/lib/utils/bonus.ts` - Bonus calculation and validation
- `src/lib/utils/export.ts` - CSV export functions
- `src/lib/utils/pdf.tsx` - PDF generation (@react-pdf/renderer, actual file download)
- `src/lib/constants.ts` - App constants (product types, statuses, nav items)
- `src/types/index.ts` - All TypeScript interfaces
- `src/lib/validators/` - Zod schemas for customer, product, transaction
- `supabase/migrations/001_initial_schema.sql` - Database schema
- `supabase/migrations/002_seed_data.sql` - Seed data

## Business Logic (Critical)

### Cascading Discount (NOT additive)
```
discounted_price = base × (1 - d1/100) × (1 - d2/100) × ...
Example: base=100, discounts=[20,20,10] → 100×0.8×0.8×0.9 = 57.6 (NOT 50%)
```
Use `calculateDiscountedPrice()` from `src/lib/utils/currency.ts`. Never sum discounts.

### Cash Basis Accounting
- Omzet/profit only recognized when transaction status = "Lunas"
- Bonus accumulation only counts Lunas transactions
- Ongkir is pass-through (no profit impact)

### Bonus System
```
bonuses_available = floor(accumulated_omzet_lunas / threshold) - bonuses_already_granted
```
- Bonus transactions: omzet=0, laba=0 (free items)
- Each bonus consumes 1 threshold, remainder carries over
- Use `calculateBonusesAvailable()` and `validateBonusGrant()` from `src/lib/utils/bonus.ts`

### Snapshot Pattern
Transaction lines store `harga_base_snapshot`, `diskon_snapshot`, `discounted_unit_price`, `line_omzet`, `line_laba` at creation time. Changing customer/product data does NOT retroactively update old transactions.

## Database

### Tables
- `customers` - Has `diskon_lm[]`, `diskon_br[]`, `bonus_threshold`, `bonuses_already_granted`, `is_deleted`
- `products` - Has `tipe` (LM/BR), `harga_modal`, `harga_base`, `is_deleted`
- `transactions` - Has `nomor_bon` (UNIQUE), `status` (Piutang/Lunas), `is_bonus`, `tanggal_lunas`
- `transaction_lines` - Stores all computed values as snapshots

### Soft Delete
Customers and products use `is_deleted` flag. Always filter `.eq("is_deleted", false)` for active records.

## Supabase Client Usage

```typescript
// Client components
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

// Server components (async)
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
```

## Shadcn/ui Notes

Using Shadcn v4 with base-ui (NOT Radix). Key differences:
- `asChild` prop does NOT exist on most components
- Use `render` prop instead: `<TooltipTrigger render={<Button />} />`
- Select `onValueChange` receives `value | null`
- Sheet/Dialog use base-ui Dialog internally

## Security

- Proxy adds security headers (CSP, HSTS, X-Frame-Options)
- Rate limiting on login (5 attempts per 15 min, in-memory)
- Blocked paths: `.env`, `.git`, `package.json`, etc.
- Auto-logout after 30 min inactivity (client-side)
- Error boundaries wrap dashboard pages

## Currency

All money uses IDR. Format with `formatIDR()` from `src/lib/utils/currency.ts`.
For precise calculations, use `decimal.js` via `toDecimal()`.

## PDF Export

Uses `@react-pdf/renderer` for actual PDF file download. Functions in `src/lib/utils/pdf.tsx` are async — always `await` them and wrap in try/catch with toast feedback.

## Theme / Dark Mode

Uses `next-themes` with `ThemeProvider` in root layout. All hardcoded colors must have `dark:` variants. CSS variables for theme colors are in `globals.css` (`:root` for light, `.dark` for dark).

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Seed Data

Run `supabase/migrations/002_seed_data.sql` in Supabase SQL Editor to populate demo data (5 customers, 7 products, 10 transactions).
