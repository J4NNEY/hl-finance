-- Seed Data untuk HL Finance
-- Jalankan setelah schema dibuat

-- Insert Customers
INSERT INTO customers (nama, diskon_lm, diskon_br, bonus_threshold, bonuses_already_granted) VALUES
('Toko Maju Jaya', ARRAY[20, 10], ARRAY[15, 5], 10000000, 1),
('CV Berkah Abadi', ARRAY[25, 15, 5], ARRAY[20, 10], 15000000, 0),
('PT Sejahtera Bersama', ARRAY[30], ARRAY[25], 20000000, 2),
('Toko Sumber Rejeki', ARRAY[15, 10], ARRAY[10, 10], 8000000, 0),
('UD Makmur Sentosa', ARRAY[20, 20, 10], ARRAY[20, 15], 12000000, 1);

-- Insert Products
INSERT INTO products (nama, tipe, harga_modal, harga_base) VALUES
('Lemari 2 Pintu', 'LM', 800000, 1500000),
('Lemari 3 Pintu', 'LM', 1200000, 2200000),
('Buffet TV', 'LM', 600000, 1100000),
('Rak Buku Besar', 'BR', 400000, 750000),
('Rak Buku Kecil', 'BR', 250000, 500000),
('Meja Kerja', 'BR', 350000, 650000),
('Kursi Kantor', 'BR', 300000, 550000);

-- Insert Transactions
DO $$
DECLARE
  cust_maju UUID;
  cust_berkah UUID;
  cust_sejahtera UUID;
  cust_sumber UUID;
  cust_makmur UUID;
  prod_l2 UUID;
  prod_l3 UUID;
  prod_buffet UUID;
  prod_rak_besar UUID;
  prod_rak_kecil UUID;
  prod_meja UUID;
  prod_kursi UUID;
  tx1 UUID;
  tx2 UUID;
  tx3 UUID;
  tx4 UUID;
  tx5 UUID;
  tx6 UUID;
  tx7 UUID;
  tx8 UUID;
  tx9 UUID;
  tx10 UUID;
BEGIN
  -- Get customer IDs
  SELECT id INTO cust_maju FROM customers WHERE nama = 'Toko Maju Jaya';
  SELECT id INTO cust_berkah FROM customers WHERE nama = 'CV Berkah Abadi';
  SELECT id INTO cust_sejahtera FROM customers WHERE nama = 'PT Sejahtera Bersama';
  SELECT id INTO cust_sumber FROM customers WHERE nama = 'Toko Sumber Rejeki';
  SELECT id INTO cust_makmur FROM customers WHERE nama = 'UD Makmur Sentosa';

  -- Get product IDs
  SELECT id INTO prod_l2 FROM products WHERE nama = 'Lemari 2 Pintu';
  SELECT id INTO prod_l3 FROM products WHERE nama = 'Lemari 3 Pintu';
  SELECT id INTO prod_buffet FROM products WHERE nama = 'Buffet TV';
  SELECT id INTO prod_rak_besar FROM products WHERE nama = 'Rak Buku Besar';
  SELECT id INTO prod_rak_kecil FROM products WHERE nama = 'Rak Buku Kecil';
  SELECT id INTO prod_meja FROM products WHERE nama = 'Meja Kerja';
  SELECT id INTO prod_kursi FROM products WHERE nama = 'Kursi Kantor';

  -- Insert transactions
  INSERT INTO transactions (nomor_bon, tanggal, customer_id, ongkir, deskripsi, is_bonus, status, tanggal_lunas)
  VALUES ('BON-2025-001', '2025-06-01', cust_maju, 150000, 'Pengiriman ke toko', false, 'Lunas', '2025-06-05')
  RETURNING id INTO tx1;

  INSERT INTO transactions (nomor_bon, tanggal, customer_id, ongkir, deskripsi, is_bonus, status, tanggal_lunas)
  VALUES ('BON-2025-002', '2025-06-03', cust_berkah, 200000, null, false, 'Piutang', null)
  RETURNING id INTO tx2;

  INSERT INTO transactions (nomor_bon, tanggal, customer_id, ongkir, deskripsi, is_bonus, status, tanggal_lunas)
  VALUES ('BON-2025-003', '2025-06-05', cust_sejahtera, 0, 'Tanpa ongkir - ambil sendiri', false, 'Lunas', '2025-06-05')
  RETURNING id INTO tx3;

  INSERT INTO transactions (nomor_bon, tanggal, customer_id, ongkir, deskripsi, is_bonus, status, tanggal_lunas)
  VALUES ('BON-2025-004', '2025-06-08', cust_maju, 100000, null, false, 'Piutang', null)
  RETURNING id INTO tx4;

  INSERT INTO transactions (nomor_bon, tanggal, customer_id, ongkir, deskripsi, is_bonus, status, tanggal_lunas)
  VALUES ('BON-2025-005', '2025-06-10', cust_sumber, 175000, 'Pengiriman ekspedisi', false, 'Lunas', '2025-06-12')
  RETURNING id INTO tx5;

  INSERT INTO transactions (nomor_bon, tanggal, customer_id, ongkir, deskripsi, is_bonus, status, tanggal_lunas)
  VALUES ('BON-2025-006', '2025-06-12', cust_makmur, 0, 'Bonus reward', true, 'Lunas', '2025-06-12')
  RETURNING id INTO tx6;

  INSERT INTO transactions (nomor_bon, tanggal, customer_id, ongkir, deskripsi, is_bonus, status, tanggal_lunas)
  VALUES ('BON-2025-007', '2025-06-15', cust_berkah, 250000, null, false, 'Piutang', null)
  RETURNING id INTO tx7;

  INSERT INTO transactions (nomor_bon, tanggal, customer_id, ongkir, deskripsi, is_bonus, status, tanggal_lunas)
  VALUES ('BON-2025-008', '2025-06-18', cust_sejahtera, 120000, null, false, 'Lunas', '2025-06-20')
  RETURNING id INTO tx8;

  INSERT INTO transactions (nomor_bon, tanggal, customer_id, ongkir, deskripsi, is_bonus, status, tanggal_lunas)
  VALUES ('BON-2025-009', '2025-06-20', cust_maju, 0, 'Pengambilan sendiri', false, 'Lunas', '2025-06-20')
  RETURNING id INTO tx9;

  INSERT INTO transactions (nomor_bon, tanggal, customer_id, ongkir, deskripsi, is_bonus, status, tanggal_lunas)
  VALUES ('BON-2025-010', '2025-06-22', cust_sumber, 180000, null, false, 'Piutang', null)
  RETURNING id INTO tx10;

  -- Insert transaction lines
  -- BON-2025-001
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx1, prod_l2, 2, 1500000, ARRAY[20, 10], 1080000, 2160000, 560000);
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx1, prod_rak_besar, 3, 750000, ARRAY[15, 5], 603750, 1811250, 611250);

  -- BON-2025-002
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx2, prod_l3, 1, 2200000, ARRAY[25, 15, 5], 1328250, 1328250, 128250);
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx2, prod_meja, 4, 650000, ARRAY[20, 10], 468000, 1872000, 472000);

  -- BON-2025-003
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx3, prod_buffet, 5, 1100000, ARRAY[30], 770000, 3850000, 850000);

  -- BON-2025-004
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx4, prod_rak_kecil, 10, 500000, ARRAY[15, 10], 382500, 3825000, 1325000);
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx4, prod_kursi, 6, 550000, ARRAY[10, 10], 445500, 2673000, 873000);

  -- BON-2025-005
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx5, prod_l2, 3, 1500000, ARRAY[15, 10], 1147500, 3442500, 1042500);

  -- BON-2025-006 (Bonus)
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx6, prod_buffet, 1, 1100000, ARRAY[]::numeric[], 0, 0, 0);

  -- BON-2025-007
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx7, prod_l3, 2, 2200000, ARRAY[25, 15, 5], 1328250, 2656500, 256500);
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx7, prod_rak_besar, 5, 750000, ARRAY[20, 10], 540000, 2700000, 700000);

  -- BON-2025-008
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx8, prod_l2, 4, 1500000, ARRAY[30], 1050000, 4200000, 1000000);

  -- BON-2025-009
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx9, prod_meja, 8, 650000, ARRAY[20, 10], 468000, 3744000, 944000);
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx9, prod_kursi, 8, 550000, ARRAY[15, 5], 446875, 3575000, 1175000);

  -- BON-2025-010
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx10, prod_buffet, 3, 1100000, ARRAY[15, 10], 841500, 2524500, 724500);
  INSERT INTO transaction_lines (transaction_id, product_id, quantity, harga_base_snapshot, diskon_snapshot, discounted_unit_price, line_omzet, line_laba)
  VALUES (tx10, prod_rak_kecil, 6, 500000, ARRAY[10, 10], 405000, 2430000, 930000);

END $$;
