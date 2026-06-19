export const APP_NAME = "HL Finance";

export const PRODUCT_TYPES = ["LM", "BR"] as const;

export const TRANSACTION_STATUSES = ["Piutang", "Lunas"] as const;

export const NAV_ITEMS = [
  {
    title: "Dashboard",
    href: "/",
    icon: "LayoutDashboard",
  },
  {
    title: "Pelanggan",
    href: "/customers",
    icon: "Users",
  },
  {
    title: "Produk",
    href: "/products",
    icon: "Package",
  },
  {
    title: "Transaksi",
    href: "/transactions",
    icon: "FileText",
  },
  {
    title: "Laporan",
    href: "/reports",
    icon: "BarChart3",
  },
] as const;

export const MONTHS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
] as const;
