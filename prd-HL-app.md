# Product Requirements Document (PRD)
# HL Sales & Receivables Management App

| | |
|---|---|
| **Status** | Draft |
| **Version** | 1.0 |
| **Last Updated** | — |
| **Author** | — |
| **Reviewer** | — |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals & Success Metrics](#2-goals--success-metrics)
3. [User & Personas](#3-user--personas)
4. [Assumptions & Constraints](#4-assumptions--constraints)
5. [Feature Breakdown](#5-feature-breakdown)
   - 5.1 Authentication
   - 5.2 Customer Management
   - 5.3 Product Management
   - 5.4 Transaction (Bon) Management
   - 5.5 Bonus Logic
   - 5.6 Customer Detail Page
   - 5.7 Recap / Reporting
6. [Business Logic Reference](#6-business-logic-reference)
7. [Edge Cases & Error Handling](#7-edge-cases--error-handling)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Tech Notes & Implementation Hints](#9-tech-notes--implementation-hints)
10. [Out of Scope](#10-out-of-scope)
11. [Open Questions](#11-open-questions)

---

## 1. Overview

**HL Sales & Receivables Management App** adalah aplikasi internal single-user yang digunakan oleh pemilik bisnis "HL" untuk mengelola seluruh siklus penjualan — mulai dari data pelanggan dan produk, pencatatan transaksi (bon), pengelolaan piutang, distribusi bonus pelanggan, hingga rekap laporan keuangan sederhana.

### Background

Saat ini pencatatan dilakukan secara manual (spreadsheet / kertas). Risiko kesalahan hitung diskon bertingkat, pelacakan piutang yang tidak akurat, dan pengelolaan bonus yang tidak konsisten mendorong kebutuhan akan aplikasi terpusat.

### Core Principles

- **Cash basis**: Omzet, laba, dan akumulasi bonus hanya diakui saat transaksi berstatus **Lunas**.
- **Single user**: Tidak ada multi-user, role, atau kolaborasi.
- **IDR only**: Tidak ada multi-currency, tidak ada PPN/pajak.
- **Soft-delete**: Data historis tidak pernah dihapus permanen.

---

## 2. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Mengeliminasi kesalahan hitung diskon bertingkat | 0 keluhan kalkulasi setelah go-live |
| Mempercepat pencatatan bon harian | Waktu input 1 bon < 2 menit |
| Visibilitas piutang real-time | User bisa melihat total piutang per pelanggan kapan saja |
| Distribusi bonus akurat dan konsisten | Bonus tersalurkan tepat sesuai aturan threshold |
| Laporan bulanan tersedia tanpa hitung manual | Rekap per pelanggan/tipe/keseluruhan siap dalam < 5 detik |

---

## 3. User & Personas

### Primary User: Pemilik / Admin HL

- Satu-satunya pengguna aplikasi.
- Melakukan input bon setiap hari.
- Memantau piutang pelanggan dan melakukan pelunasan.
- Mengecek laporan omzet, laba, dan bonus secara berkala.
- Tidak memiliki latar belakang teknis; mengharapkan UI yang intuitif.

---

## 4. Assumptions & Constraints

| # | Assumption / Constraint |
|---|---|
| A1 | Satu akun pengguna; tidak ada registrasi atau manajemen user. |
| A2 | Semua transaksi dalam IDR. Tidak ada konversi mata uang. |
| A3 | Tidak ada integrasi dengan sistem eksternal (e.g., akuntansi, e-commerce). |
| A4 | Tidak ada PPN, pajak, atau biaya lain selain ongkir. |
| A5 | Ongkir adalah pass-through: ditagih ke pelanggan, tidak mempengaruhi laba. |
| A6 | Omzet dan laba baru diakui saat status transaksi menjadi Lunas (cash basis). |
| A7 | Soft-delete berlaku untuk Customer dan Product; data historis tetap utuh. |
| A8 | Export hanya dalam format PDF. |
| A9 | Nomor Bon harus unik secara global di seluruh sistem. |

---

## 5. Feature Breakdown

### 5.1 Authentication

#### Description
Proteksi akses aplikasi dengan satu akun login. Tidak ada registrasi atau reset password mandiri.

#### User Stories

| ID | Story |
|---|---|
| US-1.1 | Sebagai pemilik HL, saya ingin login dengan username & password agar data bisnis saya aman dari akses orang lain. |
| US-1.2 | Sebagai pemilik HL, saya ingin sesi login tetap aktif selama saya tidak logout agar tidak perlu login berulang kali. |
| US-1.3 | Sebagai pemilik HL, saya ingin ada tombol logout yang jelas agar saya bisa mengakhiri sesi dengan mudah. |

#### Acceptance Criteria
- Login wajib sebelum mengakses fitur apapun. (AC-1.1)
- Hanya satu akun; tidak ada halaman registrasi. (AC-1.2)
- Login berhasil → redirect ke dashboard. (AC-1.3)
- Login gagal → pesan error jelas, tidak ada akses. (AC-1.4)
- Sesi persisten hingga logout. Logout tersedia di semua halaman. (AC-1.5)

#### Edge Cases
- Akses URL langsung saat belum login → redirect ke halaman login.
- Session expired (jika diimplementasi) → redirect ke login dengan pesan informatif, bukan error kosong.

---

### 5.2 Customer Management

#### Description
CRUD pelanggan beserta konfigurasi diskon bertingkat per tipe produk (LM & BR) dan threshold bonus.

#### User Stories

| ID | Story |
|---|---|
| US-2.1 | Sebagai admin, saya ingin menambah pelanggan baru dengan nama dan konfigurasi diskon agar data pelanggan tersimpan terpusat. |
| US-2.2 | Sebagai admin, saya ingin mengubah diskon pelanggan kapan saja agar bisa menyesuaikan perjanjian harga. |
| US-2.3 | Sebagai admin, saya ingin menghapus pelanggan yang sudah tidak aktif tanpa kehilangan data transaksi historisnya. |
| US-2.4 | Sebagai admin, saya ingin menyimpan urutan diskon bertingkat per tipe (LM/BR) agar kalkulasi harga akurat. |
| US-2.5 | Sebagai admin, saya ingin mengatur threshold bonus per pelanggan agar sistem bisa menentukan kapan bonus tersedia. |

#### Data Model

```
Customer {
  id          : UUID
  nama        : string (required)
  diskon_lm   : number[]   // ordered list, e.g. [20, 20, 10]
  diskon_br   : number[]   // ordered list
  bonus_threshold : number // in IDR, e.g. 10000000
  is_deleted  : boolean    // soft-delete flag
  created_at  : timestamp
  updated_at  : timestamp
}
```

#### Business Rules
- Diskon bertingkat (cascading): `harga_jual = base × Π(1 − dᵢ/100)`
- Contoh: `base = 100`, `LM = [20, 20, 10]` → `100 × 0.8 × 0.8 × 0.9 = 57.6` (bukan 50%)
- Nilai diskon: numerik, antara 0–100. Di luar range → ditolak.
- Urutan diskon penting; reordering harus didukung di UI.

#### Acceptance Criteria
- Create dengan nama wajib. (AC-2.1)
- Edit semua field. (AC-2.2)
- Soft-delete: hilang dari dropdown pilihan, riwayat tetap ada. (AC-2.3)
- Dua discount set terpisah: LM dan BR. (AC-2.4)
- Discount set adalah ordered list, urutan bisa diatur. (AC-2.5)
- CRUD per discount step dalam satu set. (AC-2.6)
- Validasi 0–100 pada setiap step. (AC-2.7)
- Field bonus threshold (angka IDR). (AC-2.8)
- Kalkulasi cascading benar (lihat contoh AC-2.9). (AC-2.9)

#### Edge Cases
- Pelanggan tanpa discount step → harga jual = harga base.
- Discount step 0% valid (tidak berpengaruh, tapi tidak ditolak).
- Bonus threshold = 0 → edge case; pertimbangkan validasi minimum (e.g., > 0).
- Mengedit diskon pelanggan tidak mempengaruhi transaksi yang sudah tersimpan (transaksi menyimpan harga terhitung saat itu, bukan referensi dinamis ke diskon).

---

### 5.3 Product Management

#### Description
CRUD produk dengan harga modal, harga jual, dan tipe (LM/BR).

#### User Stories

| ID | Story |
|---|---|
| US-3.1 | Sebagai admin, saya ingin menambah produk baru beserta harga dan tipenya. |
| US-3.2 | Sebagai admin, saya ingin mengubah harga modal/jual produk tanpa mengganggu transaksi lama. |
| US-3.3 | Sebagai admin, saya ingin menghapus produk yang sudah tidak dijual tanpa kehilangan data historis. |

#### Data Model

```
Product {
  id          : UUID
  nama        : string (required)
  tipe        : enum('LM', 'BR')
  harga_modal : number  // cost price, >= 0
  harga_base  : number  // selling price before discount, >= 0
  is_deleted  : boolean
  created_at  : timestamp
  updated_at  : timestamp
}
```

#### Business Rules
- Tipe hanya `LM` atau `BR`.
- `harga_modal` digunakan untuk kalkulasi laba; tidak pernah ditampilkan ke pelanggan.
- `harga_base` adalah titik awal sebelum diskon bertingkat diterapkan.

#### Acceptance Criteria
- CRUD produk. (AC-3.1)
- Tipe dibatasi LM / BR. (AC-3.2)
- Harga modal & harga base ≥ 0. (AC-3.3)
- Harga modal tidak tampil sebagai harga pelanggan. (AC-3.4)
- Soft-delete produk. (AC-3.5)

#### Edge Cases
- Harga modal > harga jual setelah diskon → laba negatif; ini valid secara sistem, tidak diblokir (hanya ditampilkan apa adanya).
- Mengedit harga produk tidak retroaktif ke transaksi lama.

---

### 5.4 Transaction (Bon) Management

#### Description
Pencatatan transaksi penjualan dengan multiple line item produk, kalkulasi otomatis harga diskon, omzet, dan laba. Mendukung status Piutang / Lunas.

#### User Stories

| ID | Story |
|---|---|
| US-4.1 | Sebagai admin, saya ingin membuat bon baru dengan memilih pelanggan dan produk agar transaksi tercatat. |
| US-4.2 | Sebagai admin, saya ingin sistem menghitung harga diskon otomatis berdasarkan pelanggan yang dipilih agar saya tidak perlu hitung manual. |
| US-4.3 | Sebagai admin, saya ingin melihat omzet dan total tagihan per bon secara langsung saat input. |
| US-4.4 | Sebagai admin, saya ingin mengedit atau menghapus bon yang sudah dibuat jika ada kesalahan input. |
| US-4.5 | Sebagai admin, saya ingin status bon default-nya Piutang dan bisa diubah ke Lunas saat pembayaran diterima. |

#### Data Model

```
Transaction (Bon) {
  id            : UUID
  nomor_bon     : string (unique, required)
  tanggal       : date (default: today)
  customer_id   : FK → Customer
  ongkir        : number >= 0
  deskripsi     : string (optional)
  is_bonus      : boolean (default: false)
  status        : enum('Piutang', 'Lunas')
  tanggal_lunas : date (nullable)
  created_at    : timestamp
  updated_at    : timestamp
}

TransactionLine {
  id                    : UUID
  transaction_id        : FK → Transaction
  product_id            : FK → Product
  quantity              : integer >= 1
  // Stored at time of transaction (not dynamically recalculated):
  harga_base_snapshot   : number
  diskon_snapshot       : number[]
  discounted_unit_price : number  // computed & stored
  line_omzet            : number  // discounted_unit_price × qty
  line_laba             : number  // (discounted_unit_price − harga_modal) × qty
}
```

> **Penting:** Harga dan diskon di-snapshot saat transaksi disimpan. Perubahan harga/diskon di masa depan tidak mempengaruhi transaksi lama, kecuali transaksi di-edit secara eksplisit.

#### Business Rules

| Quantity | Formula |
|---|---|
| Discounted unit price | `base × Π(1 − dᵢ/100)` menggunakan diskon set pelanggan untuk tipe produk tersebut |
| Line omzet | `discounted unit price × qty` |
| Transaction omzet | `Σ line omzet` (ongkir dikecualikan) |
| Amount owed (Piutang) | `transaction omzet + ongkir` |
| Line Laba HL | `(discounted unit price − harga modal) × qty` |
| Transaction Laba HL | `Σ line Laba HL` (ongkir pass-through, tidak masuk laba) |

#### Acceptance Criteria
- Tanggal pre-fill hari ini, bisa diubah. (AC-4.1)
- Nomor Bon wajib, unik; duplikat ditolak. (AC-4.2)
- Customer dipilih dari list (bukan free text). (AC-4.3)
- Produk dipilih dari katalog (bukan free text). (AC-4.4)
- Multiple product lines; qty ≥ 1. (AC-4.5)
- UI tampilkan tipe (LM/BR) dan harga terdiskon per line. (AC-4.6)
- Diskon otomatis dari customer × tipe produk; tidak diinput manual. (AC-4.7)
- Ongkir numerik ≥ 0, per transaksi. (AC-4.8)
- Status default Piutang. (AC-4.9)
- View, edit, delete transaksi. (AC-4.10)
- Edit merecalculate semua computed values. (AC-4.10.1)
- Tampilkan per-line omzet, total omzet, ongkir, total tagihan. (AC-4.11)

#### Edge Cases
- Bon dengan 0 line item → tidak bisa disimpan.
- Edit bon yang sudah Lunas → sistem boleh mengizinkan, tapi perlu konfirmasi (status bisa dipertimbangkan untuk di-reset atau dipertahankan; jadikan Open Question jika belum diputuskan).
- Pelanggan di-soft-delete setelah bon dibuat → bon tetap valid dan tampil dengan nama pelanggan (dari snapshot atau relasi yang dipertahankan).
- Produk di-soft-delete setelah ada di bon → bon tetap valid; produk tetap tampil di detail bon.
- Nomor Bon case-sensitivity → definisikan apakah "BON001" dan "bon001" dianggap sama.

---

### 5.5 Bonus Logic

#### Description
Sistem pelacakan dan pencairan bonus pelanggan berdasarkan akumulasi omzet Lunas. Bonus dicatat sebagai bon khusus tanpa dampak omzet/laba.

#### User Stories

| ID | Story |
|---|---|
| US-5.1 | Sebagai admin, saya ingin sistem otomatis memberi tahu ketika pelanggan berhak mendapat bonus agar saya tidak perlu hitung manual. |
| US-5.2 | Sebagai admin, saya ingin membuat bon bonus untuk pelanggan yang sudah memenuhi syarat. |
| US-5.3 | Sebagai admin, saya ingin bonus tidak dihitung sebagai omzet agar laporan revenue tidak terdistorsi. |

#### Business Rules

```
Bonus accumulator (per customer) = Σ omzet transaksi dengan status = Lunas

Bonuses available = floor(bonus_accumulator / threshold) − bonuses_already_granted

Saat bon bonus dibuat dengan N bonuses:
  bonuses_already_granted += N
  Sisa akumulasi = bonus_accumulator mod threshold (carry over)
```

#### Worked Example

```
Threshold pelanggan A  = Rp 10.000.000
Akumulasi omzet Lunas  = Rp 25.000.000
Bonus sudah diberikan  = 0

Bonus tersedia = floor(25.000.000 / 10.000.000) − 0 = 2

→ User membuat 1 bon bonus, assign 2 bonus
→ 2 × 10.000.000 = Rp 20.000.000 terpakai
→ Sisa carry over = Rp 5.000.000
→ Produk bonus: omzet = 0, laba = 0
```

#### Acceptance Criteria
- Threshold per pelanggan. (AC-5.1)
- Akumulasi hanya dari transaksi Lunas. (AC-5.2)
- Bonuses stack; rumus `floor(akumulasi/threshold) − granted`. (AC-5.3)
- Notifikasi/flag ketika bonus tersedia + jumlahnya. (AC-5.4)
- Bonus dicatat sebagai bon dengan `is_bonus = true`; boleh multiple bonus dalam 1 bon. (AC-5.5)
- Setiap bonus dikonsumsi 1 threshold; sisa carry over. (AC-5.6)
- Line produk bonus: omzet = 0, tidak kurangi laba. (AC-5.7)
- Bon bonus terlihat berbeda di list dan rekap. (AC-5.8)

#### Edge Cases
- Pelanggan belum pernah Lunas → bonus = 0, tidak ada notifikasi.
- Threshold diubah setelah ada akumulasi → sistem menggunakan threshold baru untuk kalkulasi ke depan; apakah recalculate retroaktif? (→ Open Question OQ-1)
- User membuat bon bonus lebih dari bonus yang tersedia → sistem harus memvalidasi dan menolak.
- Bon bonus di-edit atau dihapus → `bonuses_already_granted` harus dikurangi kembali (bonus "dikembalikan").

---

### 5.6 Customer Detail Page

#### Description
Halaman per pelanggan yang menampilkan seluruh aktivitas transaksi, dikelompokkan per bulan, dengan kemampuan settlement piutang dan unduh PDF.

#### User Stories

| ID | Story |
|---|---|
| US-6.1 | Sebagai admin, saya ingin melihat semua bon pelanggan per bulan agar mudah memantau aktivitas. |
| US-6.2 | Sebagai admin, saya ingin melunasi semua bon satu bulan sekaligus agar proses settlement lebih cepat. |
| US-6.3 | Sebagai admin, saya ingin melunasi satu bon tertentu secara individual jika perlu. |
| US-6.4 | Sebagai admin, saya ingin mengunduh daftar piutang dan transaksi sebagai PDF untuk dokumentasi. |

#### Page Structure

```
Customer Detail Page
├── Header: Nama pelanggan, threshold bonus, status bonus
├── Month/Year Selector
└── Selected Month View
    ├── Transaction list (date, nomor bon, status, amount)
    ├── Summary:
    │   ├── Total Piutang (omzet + ongkir, status = Piutang)
    │   ├── Total Sudah Dibayar (omzet + ongkir, status = Lunas)
    │   ├── Total Omzet Lunas (excl. ongkir) — split LM | BR | Total
    │   └── Total Laba HL Lunas
    └── Actions: Sudah Lunas (settle month), Download PDF
```

#### Settlement Flow Detail

**Settle Month (AC-6.5):**
1. User klik "Sudah Lunas" di tampilan bulan tertentu.
2. Modal muncul → input Tanggal Pelunasan.
3. Konfirmasi → semua transaksi bulan tersebut (status Piutang) → Lunas + tanggal diisi.
4. Totals update real-time.

**Settle Single Bon (AC-6.6):**
1. User buka detail bon.
2. Klik "Lunas".
3. Modal → input Tanggal Pelunasan.
4. Konfirmasi → hanya bon tersebut yang diubah ke Lunas.

#### Acceptance Criteria
- Transaksi dikelompokkan per bulan, bulan bisa dipilih. (AC-6.1)
- Summary per bulan: Piutang, Sudah Dibayar, Omzet (LM/BR), Laba. (AC-6.2)
- Omzet terpisah kolom LM vs BR + total. (AC-6.3)
- Download PDF tersedia. (AC-6.4)
- Settle month via modal + tanggal pelunasan. (AC-6.5)
- Settle single bon via modal + tanggal pelunasan. (AC-6.6)
- Totals update immediately setelah settlement. (AC-6.7)
- Bon Lunas tidak bisa di-re-settle; tampil berbeda secara visual. (AC-6.8)
- Klik bon → buka detail lengkap. (AC-6.9)

#### Edge Cases
- Bulan tanpa transaksi → tampilkan empty state, bukan error.
- Settle month saat semua bon sudah Lunas → tombol disabled atau tidak ada efek.
- Tanggal Pelunasan diisi lebih awal dari Tanggal Bon → sistem boleh mengizinkan (tidak ada constraint bisnis yang memblokir ini, kecuali ditetapkan).
- PDF kosong (bulan tanpa data) → generate PDF dengan keterangan "tidak ada transaksi".

---

### 5.7 Recap / Reporting

#### Description
Laporan ringkasan omzet, laba, piutang, dan pembayaran — dapat difilter per bulan/tahun, per pelanggan, per tipe produk, atau keseluruhan. Dapat diunduh sebagai PDF.

#### User Stories

| ID | Story |
|---|---|
| US-7.1 | Sebagai admin, saya ingin melihat rekap per pelanggan agar bisa mengevaluasi performa tiap pelanggan. |
| US-7.2 | Sebagai admin, saya ingin rekap per tipe produk (LM/BR) agar tahu kontribusi masing-masing lini. |
| US-7.3 | Sebagai admin, saya ingin rekap keseluruhan untuk gambaran bisnis secara total. |
| US-7.4 | Sebagai admin, saya ingin memfilter rekap per bulan dan tahun agar analisis lebih fokus. |
| US-7.5 | Sebagai admin, saya ingin mengunduh rekap sebagai PDF untuk arsip atau laporan. |

#### Report Types

| Tipe Rekap | Dimensi | Konten |
|---|---|---|
| Per Pelanggan | 1 pelanggan, filter bulan/tahun | Omzet (LM/BR), Laba, Piutang, Sudah Dibayar |
| Per Tipe Produk | LM atau BR, filter bulan/tahun | Omzet, Laba, Piutang — semua pelanggan |
| Keseluruhan | Semua pelanggan, filter bulan/tahun | Total Omzet, Total Laba, Total Piutang, Total Dibayar |

#### Acceptance Criteria
- Rekap per pelanggan. (AC-7.1)
- Rekap per tipe LM / BR. (AC-7.2)
- Rekap keseluruhan. (AC-7.3)
- Filter per bulan dan tahun. (AC-7.4)
- Tampilkan: Omzet Lunas, Laba Lunas, Piutang outstanding, Sudah Dibayar; breakdown LM vs BR. (AC-7.5)
- Total Laba HL lintas semua pelanggan tersedia di rekap overall. (AC-7.6)
- Bon bonus dikecualikan dari omzet/laba; bisa ditampilkan sebagai bonus log terpisah. (AC-7.7)
- Download PDF. (AC-7.8)

#### Edge Cases
- Filter bulan/tahun tanpa data → tampilkan rekap kosong (semua nilai 0), bukan error.
- Pelanggan soft-deleted tetap muncul di rekap historis.
- Produk soft-deleted tetap dihitung dalam rekap historis.

---

## 6. Business Logic Reference

### 6.1 Master Calculation Table

| Quantity | Formula |
|---|---|
| Discounted unit price | `base × Π(1 − dᵢ/100)` atas semua discount steps pelanggan untuk tipe tersebut |
| Line omzet | `discounted_unit_price × qty` |
| Transaction omzet | `Σ line omzet` (ongkir dikecualikan) |
| Amount owed (Piutang) | `transaction omzet + ongkir` |
| Line Laba HL | `(discounted_unit_price − harga_modal) × qty` |
| Transaction Laba HL | `Σ line Laba HL` (ongkir pass-through) |
| Recognized Omzet (laporan) | `Σ transaction omzet` di mana `status = Lunas` |
| Recognized Laba HL (laporan) | `Σ transaction Laba HL` di mana `status = Lunas` |
| Total sudah dibayar | `Σ (omzet + ongkir)` di mana `status = Lunas` |
| Total piutang outstanding | `Σ (omzet + ongkir)` di mana `status = Piutang` |
| Bonus accumulator | `Σ omzet` di mana `status = Lunas` (per pelanggan) |
| Bonuses available | `floor(bonus_accumulator / threshold) − bonuses_already_granted` |
| Bonus items | Gratis → omzet = 0, tidak mempengaruhi laba |

### 6.2 Cascading Discount Example

```
Base price      = Rp 100.000
Discount steps  = [20%, 20%, 10%]

Step 1: 100.000 × (1 − 0.20) = 80.000
Step 2:  80.000 × (1 − 0.20) = 64.000
Step 3:  64.000 × (1 − 0.10) = 57.600

Discounted price = Rp 57.600
Effective discount = 42.4%  ← BUKAN 50% (20+20+10)
```

### 6.3 Confirmed Decisions

| # | Keputusan |
|---|---|
| D1 | Ongkir adalah pass-through: tidak menambah laba. Laba = omzet − modal. |
| D2 | Tagihan ke pelanggan = omzet + ongkir; omzet sendiri tidak termasuk ongkir. |
| D3 | Hanya transaksi Lunas yang dihitung dalam omzet, laba, dan akumulasi bonus (cash basis). |
| D4 | Bonus stack; multiple bonus bisa dalam 1 bon; tiap bonus konsumsi 1 threshold, sisa carry over. |
| D5 | Harga modal bonus diabaikan dalam laba — item bonus gratis tidak mengurangi Laba HL. |
| D6 | Soft-delete untuk Customer dan Product. |
| D7 | Nomor Bon harus unik; duplikat ditolak. |
| D8 | Export dalam format PDF. |
| D9 | IDR only, tanpa PPN. |

---

## 7. Edge Cases & Error Handling

| Skenario | Penanganan |
|---|---|
| Login dengan kredensial salah | Tampilkan pesan error jelas; tidak ada akses |
| Nomor Bon duplikat | Tolak save; tampilkan error dengan nomor yang konflik |
| Diskon di luar range 0–100 | Validasi inline; tolak input |
| Bon tanpa line item | Tidak bisa disimpan; tampilkan pesan |
| Qty < 1 pada line item | Validasi; tolak |
| Ongkir negatif | Validasi; tolak |
| Edit bon Lunas | Perlu konfirmasi; pertimbangkan apakah status perlu di-reset (→ OQ-2) |
| Delete bon Lunas | Pertimbangkan apakah diizinkan; jika ya, bonus accumulator perlu direcalculate |
| Bon bonus melebihi bonus tersedia | Validasi saat save; tampilkan jumlah bonus yang tersedia |
| Bon bonus dihapus | `bonuses_already_granted` dikurangi |
| Pelanggan dihapus (soft) | Tetap tampil di transaksi lama; hilang dari dropdown input baru |
| Produk dihapus (soft) | Tetap tampil di bon lama; hilang dari dropdown input baru |
| Threshold bonus diubah | Recalculate bonuses_available berdasarkan threshold baru (→ OQ-1) |
| Session expired | Redirect ke login dengan pesan |
| Filter rekap tanpa data | Tampilkan empty state (nilai 0), bukan error |
| PDF kosong | Generate dengan keterangan "tidak ada data" |

---

## 8. Non-Functional Requirements

| Kategori | Requirement |
|---|---|
| **Keamanan** | Seluruh halaman dilindungi login; credentials tidak disimpan plaintext |
| **Performa** | Halaman customer detail & rekap load < 3 detik untuk data hingga 12 bulan |
| **Akurasi** | Kalkulasi keuangan menggunakan presisi desimal yang memadai (hindari floating point rounding error) |
| **Usability** | UI responsif; input bon harian < 2 menit; pesan error informatif |
| **Ketersediaan** | Aplikasi internal; SLA tidak formal, tapi downtime harus minimal |
| **Export** | PDF harus dapat dibuka di viewer standar (Adobe, browser PDF viewer) |
| **Data integrity** | Soft-delete menjaga integritas referensial; tidak ada data historis yang hilang |

---

## 9. Tech Notes & Implementation Hints

### 9.1 Kalkulasi Harga — Snapshot vs Dynamic
Simpan `discounted_unit_price`, `line_omzet`, dan `line_laba` langsung di record `TransactionLine` pada saat transaksi disimpan. Jangan hitung ulang secara dinamis dari tabel diskon pelanggan — ini mencegah perubahan diskon di masa depan merusak data historis.

### 9.2 Presisi Numerik
Gunakan tipe data yang mendukung presisi desimal (e.g., `DECIMAL` / `NUMERIC` di database relasional, atau `BigInt` + representasi sen jika menggunakan integer arithmetic). Hindari `FLOAT` / `DOUBLE` untuk nilai uang.

### 9.3 Bonus Counter
Simpan `bonuses_already_granted` per pelanggan sebagai field terpisah (bukan dihitung dari scan semua bon bonus), agar query lebih efisien. Update secara atomik saat bon bonus dibuat atau dihapus.

### 9.4 Status Transition
Status transaksi hanya bergerak satu arah: `Piutang → Lunas`. Tidak ada "un-settle". Jika bon Lunas perlu dikoreksi, pertimbangkan flow edit dengan konfirmasi eksplisit.

### 9.5 Soft-Delete Pattern
Tambahkan kolom `is_deleted: boolean` + `deleted_at: timestamp` pada tabel Customer dan Product. Query default selalu filter `is_deleted = false` kecuali untuk laporan historis.

### 9.6 PDF Generation
Pertimbangkan library server-side (e.g., `puppeteer`, `wkhtmltopdf`, `reportlab` untuk Python) atau client-side (`jsPDF`, browser print-to-PDF). Pastikan format PDF konsisten untuk semua tipe export (bon detail, daftar piutang, rekap).

### 9.7 Unique Nomor Bon
Enforce uniqueness di level database (UNIQUE constraint) dan di level aplikasi (cek sebelum insert, tampilkan error yang informatif).

---

## 10. Out of Scope

- Multi-user / role-based access control
- Multi-currency atau kurs
- Integrasi dengan sistem akuntansi eksternal
- PPN / pajak
- Manajemen stok / inventory
- Notifikasi otomatis (email, WhatsApp) ke pelanggan
- Mobile app native (Android/iOS)
- Audit log perubahan data
- Backup & restore otomatis

---

## 11. Open Questions

| ID | Pertanyaan | Impact |
|---|---|---|
| OQ-1 | Jika threshold bonus pelanggan diubah, apakah `bonuses_available` dihitung ulang retroaktif dari seluruh akumulasi historis? | Mempengaruhi bonus yang tersedia setelah perubahan threshold |
| OQ-2 | Apakah bon yang sudah Lunas bisa diedit? Jika ya, apakah status otomatis di-reset ke Piutang? | Integritas data; alur koreksi bon |
| OQ-3 | Apakah bon Lunas yang dihapus harus mengurangi bonus accumulator? | Konsistensi bonus counter |
| OQ-4 | Apakah Nomor Bon case-sensitive? ("BON001" vs "bon001") | Validasi duplikat |
| OQ-5 | Apakah ada minimum nilai untuk bonus threshold? (e.g., > 0) | Validasi input customer |
| OQ-6 | Apakah rekap per tipe produk menampilkan breakdown per pelanggan atau hanya total? | Scope tampilan rekap |
