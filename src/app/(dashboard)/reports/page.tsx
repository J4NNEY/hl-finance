"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Customer } from "@/types";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Filter, Download, Gift } from "lucide-react";
import { formatIDR } from "@/lib/utils/currency";
import { generateRecapPDF } from "@/lib/utils/pdf";
import { toast } from "sonner";
import { MONTHS } from "@/lib/constants";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ReportTransaction {
  id: string;
  tanggal: string;
  nomor_bon: string;
  ongkir: number;
  is_bonus: boolean;
  status: string;
  customer?: { id: string; nama: string };
  transaction_lines?: { line_omzet: number; line_laba: number; product?: { tipe: string } }[];
}

interface ReportData {
  total_omzet_lunas: number;
  total_laba_lunas: number;
  total_piutang: number;
  total_sudah_dibayar: number;
  omzet_lm: number;
  omzet_br: number;
}

export default function ReportsPage() {
  const supabase = createClient();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [reportType, setReportType] = useState("overall");
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<ReportTransaction[]>([]);
  const [bonusTransactions, setBonusTransactions] = useState<ReportTransaction[]>([]);
  const [reportData, setReportData] = useState<ReportData>({
    total_omzet_lunas: 0,
    total_laba_lunas: 0,
    total_piutang: 0,
    total_sudah_dibayar: 0,
    omzet_lm: 0,
    omzet_br: 0,
  });

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  useEffect(() => {
    const fetchCustomers = async () => {
      const { data } = await supabase
        .from("customers")
        .select("*")
        .eq("is_deleted", false)
        .order("nama");

      setCustomers(data || []);
    };

    fetchCustomers();
  }, [supabase]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);

    let query = supabase.from("transactions").select(`
      *,
      customer:customers(id, nama),
      transaction_lines(
        *,
        product:products(tipe)
      )
    `);

    if (selectedCustomer !== "all") {
      query = query.eq("customer_id", selectedCustomer);
    }

    const year = parseInt(selectedYear);
    if (selectedMonth === "all") {
      query = query
        .gte("tanggal", `${year}-01-01`)
        .lte("tanggal", `${year}-12-31`);
    } else {
      const month = parseInt(selectedMonth);
      const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];
      query = query.gte("tanggal", startDate).lte("tanggal", endDate);
    }

    const { data: fetchedTransactions, error } = await query;

    if (error) {
      toast.error("Gagal memuat data laporan");
      setLoading(false);
      return;
    }

    setTransactions(fetchedTransactions || []);

    // Separate bonus transactions
    const bonusTxs = fetchedTransactions?.filter((t) => t.is_bonus) || [];
    setBonusTransactions(bonusTxs);

    let totalOmzetLunas = 0;
    let totalLabaLunas = 0;
    let totalPiutang = 0;
    let totalSudahDibayar = 0;
    let omzetLM = 0;
    let omzetBR = 0;

    fetchedTransactions?.forEach((t) => {
      // AC-7.7: Exclude bonus transactions from omzet/profit totals
      if (t.is_bonus) return;

      const lineOmzet =
        t.transaction_lines?.reduce(
          (sum: number, l: { line_omzet: number }) => sum + (l.line_omzet || 0),
          0
        ) || 0;
      const lineLaba =
        t.transaction_lines?.reduce(
          (sum: number, l: { line_laba: number }) => sum + (l.line_laba || 0),
          0
        ) || 0;
      const total = lineOmzet + (t.ongkir || 0);

      if (t.status === "Lunas") {
        totalOmzetLunas += lineOmzet;
        totalLabaLunas += lineLaba;
        totalSudahDibayar += total;

        t.transaction_lines?.forEach((l: { line_omzet: number; product?: { tipe: string } }) => {
          if (l.product?.tipe === "LM") {
            omzetLM += l.line_omzet;
          } else if (l.product?.tipe === "BR") {
            omzetBR += l.line_omzet;
          }
        });
      } else {
        totalPiutang += total;
      }
    });

    setReportData({
      total_omzet_lunas: totalOmzetLunas,
      total_laba_lunas: totalLabaLunas,
      total_piutang: totalPiutang,
      total_sudah_dibayar: totalSudahDibayar,
      omzet_lm: omzetLM,
      omzet_br: omzetBR,
    });

    setLoading(false);
  }, [supabase, selectedCustomer, selectedMonth, selectedYear]);

  useEffect(() => {
    fetchReportData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [selectedCustomer, selectedMonth, selectedYear, reportType, fetchReportData]);

  const getReportTitle = () => {
    if (reportType === "customer" && selectedCustomer !== "all") {
      const customer = customers.find((c) => c.id === selectedCustomer);
      return `Laporan ${customer?.nama}`;
    }

    return `Laporan ${reportType === "type" ? "Per Tipe" : "Keseluruhan"}`;
  };

  const getReportSubtitle = () => {
    const month =
      selectedMonth === "all"
        ? "Semua Bulan"
        : MONTHS.find((m) => m.value === parseInt(selectedMonth))?.label;
    return `${month} ${selectedYear}`;
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Laporan</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          Rekap omzet, laba, dan piutang
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-stone-400 dark:text-stone-500" />
            Filter Laporan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Tipe</label>
              <Select value={reportType} onValueChange={(v) => setReportType(v || "overall")}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Keseluruhan</SelectItem>
                  <SelectItem value="customer">Per Pelanggan</SelectItem>
                  <SelectItem value="type">Per Tipe Produk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "customer" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Pelanggan</label>
                <Select
                  value={selectedCustomer}
                  onValueChange={(v) => setSelectedCustomer(v || "all")}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Pilih pelanggan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Pelanggan</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Bulan</label>
              <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v || "all")}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Bulan</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Tahun</label>
              <Select value={selectedYear} onValueChange={(v) => setSelectedYear(v || new Date().getFullYear().toString())}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1.5">
              <div className="h-6 w-48 bg-stone-200 rounded animate-pulse" />
              <div className="h-4 w-32 bg-stone-100 rounded animate-pulse" />
            </div>
            <div className="h-9 w-32 bg-stone-200 rounded-lg animate-pulse" />
          </div>
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3 rounded-xl border border-stone-200/80 bg-white p-5">
              <div className="h-4 w-40 bg-stone-200 rounded animate-pulse mb-4" />
              <div className="h-[250px] bg-stone-100 rounded-lg animate-pulse" />
            </div>
            <div className="lg:col-span-2 grid gap-4 content-start">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-stone-200/80 bg-white p-4">
                  <div className="h-3 w-20 bg-stone-200 rounded animate-pulse mb-2" />
                  <div className="h-6 w-32 bg-stone-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Report Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{getReportTitle()}</h2>
              <p className="text-sm text-stone-500 dark:text-stone-400">{getReportSubtitle()}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    await generateRecapPDF({
                      title: getReportTitle(),
                      subtitle: getReportSubtitle(),
                      reportData,
                      transactions: transactions as Parameters<typeof generateRecapPDF>[0]["transactions"],
                    });
                    toast.success("PDF berhasil diunduh");
                  } catch {
                    toast.error("Gagal membuat PDF");
                  }
                }}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>

          {/* Chart + Stats */}
          <div className="grid gap-6 lg:grid-cols-5">
            <Card className="lg:col-span-3">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-stone-700 dark:text-stone-200">
                  Perbandingan Keuangan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height={250} minWidth={0}>
                    <BarChart
                      data={[
                    { name: "Omzet", value: reportData.total_omzet_lunas, color: isDark ? "#818cf8" : "#4338ca" },
                    { name: "Laba", value: reportData.total_laba_lunas, color: isDark ? "#34d399" : "#059669" },
                    { name: "Piutang", value: reportData.total_piutang, color: isDark ? "#f87171" : "#dc2626" },
                    { name: "Dibayar", value: reportData.total_sudah_dibayar, color: isDark ? "#a78bfa" : "#7c3aed" },
                  ]}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#292524" : "#f1f5f9"} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: isDark ? "#a8a29e" : "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: isDark ? "#a8a29e" : "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) =>
                      v >= 1000000
                        ? `${(v / 1000000).toFixed(0)}jt`
                        : v >= 1000
                          ? `${(v / 1000).toFixed(0)}rb`
                          : v.toString()
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 10,
                      border: `1px solid ${isDark ? "#292524" : "#e2e8f0"}`,
                      background: isDark ? "#1c1917" : "#fff",
                      color: isDark ? "#e7e5e4" : "#1c1917",
                      boxShadow: isDark
                        ? "0 4px 12px rgba(0,0,0,0.4)"
                        : "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                    formatter={(value) => [formatIDR(Number(value))]}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {[
                      { name: "Omzet", value: reportData.total_omzet_lunas, color: isDark ? "#818cf8" : "#4338ca" },
                      { name: "Laba", value: reportData.total_laba_lunas, color: isDark ? "#34d399" : "#059669" },
                      { name: "Piutang", value: reportData.total_piutang, color: isDark ? "#f87171" : "#dc2626" },
                      { name: "Dibayar", value: reportData.total_sudah_dibayar, color: isDark ? "#a78bfa" : "#7c3aed" },
                    ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 grid gap-4 content-start">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Omzet Lunas</p>
                  <p className="text-xl font-bold text-indigo-600 mt-1">
                    {formatIDR(reportData.total_omzet_lunas)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Laba HL</p>
                  <p className="text-xl font-bold text-emerald-600 mt-1">
                    {formatIDR(reportData.total_laba_lunas)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Piutang</p>
                  <p className="text-xl font-bold text-red-600 mt-1">
                    {formatIDR(reportData.total_piutang)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Sudah Dibayar</p>
                  <p className="text-xl font-bold text-purple-600 mt-1">
                    {formatIDR(reportData.total_sudah_dibayar)}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Breakdown by Type */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-stone-700 dark:text-stone-200">
                Breakdown per Tipe Produk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center justify-between p-4 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                  <div>
                    <p className="text-sm font-medium text-indigo-700 dark:text-indigo-400">LM (Lemari)</p>
                    <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400 mt-1">
                      {formatIDR(reportData.omzet_lm)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {reportData.total_omzet_lunas > 0
                        ? ((reportData.omzet_lm / reportData.total_omzet_lunas) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30">
                  <div>
                    <p className="text-sm font-medium text-violet-700 dark:text-violet-400">BR (Bukan Lemari)</p>
                    <p className="text-xl font-bold text-violet-700 dark:text-violet-400 mt-1">
                      {formatIDR(reportData.omzet_br)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                      {reportData.total_omzet_lunas > 0
                        ? ((reportData.omzet_br / reportData.total_omzet_lunas) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bonus Log */}
          {bonusTransactions.length > 0 && (
            <Card className="border-yellow-200 dark:border-yellow-900/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  Log Bonus
                </CardTitle>
                <CardDescription>
                  {bonusTransactions.length} transaksi bonus di periode ini
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-yellow-50/80 dark:bg-yellow-950/20">
                        <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                          Tanggal
                        </TableHead>
                        <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                          No. Bon
                        </TableHead>
                        <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                          Pelanggan
                        </TableHead>
                        <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                          Status
                        </TableHead>
                        <TableHead className="text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                          Jumlah Item
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bonusTransactions.map((t) => (
                        <TableRow key={t.id} className="hover:bg-yellow-50/50 dark:hover:bg-yellow-950/10">
                          <TableCell className="text-sm">
                            {format(new Date(t.tanggal), "dd MMM yyyy", {
                              locale: localeID,
                            })}
                          </TableCell>
                          <TableCell>
                              <span className="font-mono text-xs bg-yellow-100 dark:bg-yellow-950/40 px-2 py-1 rounded">
                              {t.nomor_bon}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">
                            {t.customer?.nama || "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                t.status === "Lunas"
                                  ? "badge-lunas"
                                  : "badge-piutang"
                              }`}
                            >
                              {t.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {t.transaction_lines?.length || 0} item
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
