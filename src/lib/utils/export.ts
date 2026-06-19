import { formatIDR } from "./currency";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";

interface ExportColumn {
  header: string;
  accessor: string;
  format?: (value: any, row: any) => string; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export function exportToCSV(
  data: any[], // eslint-disable-line @typescript-eslint/no-explicit-any
  columns: ExportColumn[],
  filename: string
) {
  // Create header row
  const headerRow = columns.map((col) => `"${col.header}"`).join(",");

  // Create data rows
  const dataRows = data.map((row) => {
    return columns
      .map((col) => {
        const value = row[col.accessor];
        const formatted = col.format ? col.format(value, row) : value;
        // Escape quotes and wrap in quotes
        const escaped = String(formatted || "").replace(/"/g, '""');
        return `"${escaped}"`;
      })
      .join(",");
  });

  // Combine and create CSV content
  const csvContent = [headerRow, ...dataRows].join("\n");

  // Add BOM for Excel compatibility with UTF-8
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });

  // Download
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${format(new Date(), "yyyyMMdd")}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export customers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportCustomers(customers: any[]) {
  const columns: ExportColumn[] = [
    { header: "Nama", accessor: "nama" },
    {
      header: "Diskon LM",
      accessor: "diskon_lm",
      format: (val: number[]) => val?.map((v) => `${v}%`).join(" → ") || "-",
    },
    {
      header: "Diskon BR",
      accessor: "diskon_br",
      format: (val: number[]) => val?.map((v) => `${v}%`).join(" → ") || "-",
    },
    {
      header: "Bonus Threshold",
      accessor: "bonus_threshold",
      format: (val: number) => formatIDR(val),
    },
    {
      header: "Bonus Diberikan",
      accessor: "bonuses_already_granted",
    },
  ];

  exportToCSV(customers, columns, "Data_Pelanggan");
}

// Export products
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportProducts(products: any[]) {
  const columns: ExportColumn[] = [
    { header: "Nama", accessor: "nama" },
    { header: "Tipe", accessor: "tipe" },
    {
      header: "Harga Modal",
      accessor: "harga_modal",
      format: (val: number) => formatIDR(val),
    },
    {
      header: "Harga Jual",
      accessor: "harga_base",
      format: (val: number) => formatIDR(val),
    },
  ];

  exportToCSV(products, columns, "Data_Produk");
}

// Export transactions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function exportTransactions(transactions: any[]) {
  const columns: ExportColumn[] = [
    {
      header: "Tanggal",
      accessor: "tanggal",
      format: (val: string) =>
        format(new Date(val), "dd/MM/yyyy", { locale: localeID }),
    },
    { header: "No. Bon", accessor: "nomor_bon" },
    {
      header: "Pelanggan",
      accessor: "customer",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      format: (val: any) => val?.nama || "-",
    },
    {
      header: "Jenis",
      accessor: "is_bonus",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      format: (val: boolean, row: any) =>
        val
          ? "Bonus"
          : row.transaction_lines
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ?.map((l: any) => l.product?.tipe)
              .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
              .join(", ") || "-",
    },
    {
      header: "Status",
      accessor: "status",
    },
    {
      header: "Omzet",
      accessor: "transaction_lines",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      format: (val: any[]) =>
        formatIDR(val?.reduce((sum: number, l: any) => sum + (l.line_omzet || 0), 0) || 0), // eslint-disable-line @typescript-eslint/no-explicit-any
    },
    {
      header: "Ongkir",
      accessor: "ongkir",
      format: (val: number) => formatIDR(val || 0),
    },
    {
      header: "Total",
      accessor: "transaction_lines",
      format: (val: any[], row: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const omzet =
          val?.reduce((sum: number, l: any) => sum + (l.line_omzet || 0), 0) || 0; // eslint-disable-line @typescript-eslint/no-explicit-any
        return formatIDR(omzet + (row.ongkir || 0));
      },
    },
    {
      header: "Laba",
      accessor: "transaction_lines",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      format: (val: any[]) =>
        formatIDR(
          val?.reduce((sum: number, l: any) => sum + (l.line_laba || 0), 0) || 0 // eslint-disable-line @typescript-eslint/no-explicit-any
        ),
    },
  ];

  exportToCSV(transactions, columns, "Data_Transaksi");
}
