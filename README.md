# HL Finance - Sales & Receivables Management

Aplikasi manajemen penjualan dan piutang untuk bisnis HL.

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS
- **UI Components:** Shadcn/ui + Radix UI
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Form:** React Hook Form + Zod
- **State:** React Context

## Fitur

- **Autentikasi** - Login single user
- **Manajemen Pelanggan** - CRUD dengan diskon bertingkat (LM/BR) dan bonus threshold
- **Manajemen Produk** - CRUD dengan harga modal, harga base, dan tipe (LM/BR)
- **Transaksi (Bon)** - Multi-line items, kalkulasi otomatis, status Piutang/Lunas
- **Bonus Logic** - Akumulasi omzet lunas → threshold → bonus
- **Detail Pelanggan** - View bulanan, settlement piutang
- **Laporan** - Rekap per pelanggan, per tipe, keseluruhan

## Setup

### 1. Buat Supabase Project

1. Buka [https://supabase.com](https://supabase.com) dan buat akun
2. Buat project baru
3. Buka **SQL Editor** dan jalankan isi file `supabase/migrations/001_initial_schema.sql`
4. Buka **Authentication** → **Providers** → Enable **Email** provider
5. Buat user baru di **Authentication** → **Users** → **Invite user**

### 2. Setup Environment Variables

1. Buka **Project Settings** → **API** di Supabase Dashboard
2. Copy **Project URL** dan **anon/public** key
3. Edit file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Install & Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### 4. Buat Akun Login

1. Buka Supabase Dashboard → **Authentication** → **Users**
2. Klik **Invite user** atau **Create user**
3. Masukkan email dan password
4. Gunakan email/password tersebut untuk login di aplikasi

### 5. Seed Data Demo (Opsional)

**Cara 1: Via Browser**
1. Buka `http://localhost:3000/login`
2. Klik tombol **"Seed Data Demo"**
3. Data akan otomatis masuk ke database

**Cara 2: Via SQL**
1. Buka SQL Editor di Supabase Dashboard
2. Jalankan isi file `supabase/migrations/002_seed_data.sql`

## Struktur Folder

```
src/
├── app/
│   ├── (auth)/           # Halaman autentikasi
│   │   └── login/
│   ├── (dashboard)/      # Halaman utama (dilindungi auth)
│   │   ├── customers/
│   │   ├── products/
│   │   ├── transactions/
│   │   └── reports/
│   └── api/              # API routes
├── components/
│   ├── ui/               # Shadcn components
│   ├── layout/           # Layout components
│   └── shared/           # Shared components
├── lib/
│   ├── supabase/         # Supabase client
│   ├── utils/            # Utility functions
│   └── validators/       # Zod schemas
├── hooks/                # Custom hooks
└── types/                # TypeScript types
```

## Business Logic

### Diskon Bertingkat (Cascading)

```
Harga Jual = Harga Base × (1 - d1/100) × (1 - d2/100) × ...

Contoh:
- Harga Base: Rp 100.000
- Diskon: [20%, 20%, 10%]
- Harga Jual: 100.000 × 0.8 × 0.8 × 0.9 = Rp 57.600
- Efektif diskon: 42.4% (bukan 50%)
```

### Bonus System

```
Bonus Tersedia = floor(Akumulasi Omzet Lunas / Threshold) - Bonus Sudah Diberikan

Contoh:
- Threshold: Rp 10.000.000
- Akumulasi Omzet Lunas: Rp 25.000.000
- Bonus Sudah Diberikan: 0
- Bonus Tersedia: floor(25.000.000 / 10.000.000) - 0 = 2
```

### Cash Basis

- Omzet dan laba hanya diakui saat transaksi berstatus **Lunas**
- Ongkir adalah pass-through (tidak mempengaruhi laba)

## Database Schema

Lihat file `supabase/migrations/001_initial_schema.sql` untuk schema lengkap.

## License

Private - Internal use only
