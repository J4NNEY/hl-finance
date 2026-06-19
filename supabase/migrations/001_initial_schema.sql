-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  diskon_lm NUMERIC[] DEFAULT '{}',
  diskon_br NUMERIC[] DEFAULT '{}',
  bonus_threshold NUMERIC NOT NULL DEFAULT 0,
  bonuses_already_granted INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama TEXT NOT NULL,
  tipe TEXT CHECK (tipe IN ('LM', 'BR')) NOT NULL,
  harga_modal NUMERIC NOT NULL DEFAULT 0 CHECK (harga_modal >= 0),
  harga_base NUMERIC NOT NULL DEFAULT 0 CHECK (harga_base >= 0),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (Bon) table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nomor_bon TEXT UNIQUE NOT NULL,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES customers(id),
  ongkir NUMERIC DEFAULT 0 CHECK (ongkir >= 0),
  deskripsi TEXT,
  is_bonus BOOLEAN DEFAULT FALSE,
  status TEXT CHECK (status IN ('Piutang', 'Lunas')) DEFAULT 'Piutang',
  tanggal_lunas DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transaction Lines table
CREATE TABLE transaction_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity >= 1),
  harga_base_snapshot NUMERIC NOT NULL,
  diskon_snapshot NUMERIC[] DEFAULT '{}',
  discounted_unit_price NUMERIC NOT NULL,
  line_omzet NUMERIC NOT NULL,
  line_laba NUMERIC NOT NULL
);

-- Indexes for better performance
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_tanggal ON transactions(tanggal);
CREATE INDEX idx_transactions_nomor_bon ON transactions(nomor_bon);
CREATE INDEX idx_transaction_lines_transaction_id ON transaction_lines(transaction_id);
CREATE INDEX idx_transaction_lines_product_id ON transaction_lines(product_id);
CREATE INDEX idx_customers_is_deleted ON customers(is_deleted);
CREATE INDEX idx_products_is_deleted ON products(is_deleted);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Since this is a single-user app, we'll enable RLS but allow all operations for authenticated users

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users (single user app - allow all)
CREATE POLICY "Allow all for authenticated users" ON customers
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON products
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON transactions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated users" ON transaction_lines
  FOR ALL USING (auth.role() = 'authenticated');

-- RPC function for atomic bonus increment
CREATE OR REPLACE FUNCTION increment_bonus_granted(p_customer_id UUID, p_count INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET bonuses_already_granted = bonuses_already_granted + p_count
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function for atomic bonus decrement
CREATE OR REPLACE FUNCTION decrement_bonus_granted(p_customer_id UUID, p_count INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE customers
  SET bonuses_already_granted = GREATEST(0, bonuses_already_granted - p_count)
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
