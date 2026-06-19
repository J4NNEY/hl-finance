export interface Customer {
  id: string;
  nama: string;
  diskon_lm: number[];
  diskon_br: number[];
  bonus_threshold: number;
  bonuses_already_granted: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  nama: string;
  tipe: "LM" | "BR";
  harga_modal: number;
  harga_base: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  nomor_bon: string;
  tanggal: string;
  customer_id: string;
  ongkir: number;
  deskripsi: string | null;
  is_bonus: boolean;
  status: "Piutang" | "Lunas";
  tanggal_lunas: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  customer?: Customer;
  transaction_lines?: TransactionLine[];
}

export interface TransactionLine {
  id: string;
  transaction_id: string;
  product_id: string;
  quantity: number;
  harga_base_snapshot: number;
  diskon_snapshot: number[];
  discounted_unit_price: number;
  line_omzet: number;
  line_laba: number;
  // Joined data
  product?: Product;
}

// Form types
export interface CustomerFormData {
  nama: string;
  diskon_lm: number[];
  diskon_br: number[];
  bonus_threshold: number;
}

export interface ProductFormData {
  nama: string;
  tipe: "LM" | "BR";
  harga_modal: number;
  harga_base: number;
}

export interface TransactionFormData {
  nomor_bon: string;
  tanggal: string;
  customer_id: string;
  ongkir: number;
  deskripsi?: string;
  is_bonus: boolean;
  lines: TransactionLineFormData[];
}

export interface TransactionLineFormData {
  product_id: string;
  quantity: number;
}

// Report types
export interface ReportSummary {
  total_omzet_lunas: number;
  total_laba_lunas: number;
  total_piutang: number;
  total_sudah_dibayar: number;
  omzet_lm: number;
  omzet_br: number;
}

export interface CustomerReport extends ReportSummary {
  customer_id: string;
  customer_nama: string;
}

// Utility types
export type ProductType = "LM" | "BR";
export type TransactionStatus = "Piutang" | "Lunas";
