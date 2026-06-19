"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Transaction, TransactionLine, Product } from "@/types";
import { Customer } from "@/types";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  Wallet,
  Download,
  Eye,
  CheckCircle2,
  Gift,
} from "lucide-react";
import { formatIDR } from "@/lib/utils/currency";
import { calculateBonusesAvailable } from "@/lib/utils/bonus";
import { generateCustomerReportPDF } from "@/lib/utils/pdf";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { MONTHS } from "@/lib/constants";

type TransactionWithLines = Transaction & {
  transaction_lines?: (TransactionLine & { product?: Pick<Product, "nama" | "tipe"> })[];
};

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params.id as string;
  const supabase = createClient();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithLines[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    (new Date().getMonth() + 1).toString()
  );
  const [selectedYear, setSelectedYear] = useState(
    new Date().getFullYear().toString()
  );
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState<{
    type: "month" | "single";
    ids: string[];
  } | null>(null);
  const [tanggalLunas, setTanggalLunas] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [settling, setSettling] = useState(false);

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [custRes, txRes] = await Promise.all([
          supabase
            .from("customers")
            .select("*")
            .eq("id", customerId)
            .single(),
          supabase
            .from("transactions")
            .select(
              `
              *,
              transaction_lines(
                *,
                product:products(nama, tipe)
              )
            `
            )
            .eq("customer_id", customerId)
            .order("tanggal", { ascending: false }),
        ]);

        if (custRes.error) throw custRes.error;
        setCustomer(custRes.data);
        setTransactions(txRes.data || []);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Terjadi kesalahan";
        toast.error("Gagal memuat data", {
          description: message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [customerId, supabase]);

  // Filter transactions by selected month/year
  const filteredTransactions = useMemo(() => {
    const month = parseInt(selectedMonth);
    const year = parseInt(selectedYear);
    return transactions.filter((t) => {
      const d = new Date(t.tanggal);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });
  }, [transactions, selectedMonth, selectedYear]);

  // Calculate stats for filtered month
  const stats = useMemo(() => {
    let omzetLunas = 0;
    let labaLunas = 0;
    let piutang = 0;
    let sudahDibayar = 0;
    let omzetLM = 0;
    let omzetBR = 0;
    let lunasCount = 0;
    let piutangCount = 0;

    filteredTransactions.forEach((t) => {
      if (t.is_bonus) return;
      const lineOmzet =
        t.transaction_lines?.reduce(
          (sum, l) => sum + (l.line_omzet || 0),
          0
        ) || 0;
      const lineLaba =
        t.transaction_lines?.reduce(
          (sum, l) => sum + (l.line_laba || 0),
          0
        ) || 0;
      const total = lineOmzet + (t.ongkir || 0);

      if (t.status === "Lunas") {
        omzetLunas += lineOmzet;
        labaLunas += lineLaba;
        sudahDibayar += total;
        lunasCount++;
        // LM/BR split
        t.transaction_lines?.forEach((l) => {
          if (l.product?.tipe === "LM") omzetLM += l.line_omzet || 0;
          else if (l.product?.tipe === "BR") omzetBR += l.line_omzet || 0;
        });
      } else {
        piutang += total;
        piutangCount++;
      }
    });

    return {
      omzetLunas,
      labaLunas,
      piutang,
      sudahDibayar,
      omzetLM,
      omzetBR,
      lunasCount,
      piutangCount,
    };
  }, [filteredTransactions]);

  // Bonus availability
  const bonusesAvailable = useMemo(() => {
    if (!customer) return 0;
    const allLunasOmzet = transactions
      .filter((t) => t.status === "Lunas" && !t.is_bonus)
      .reduce((sum, t) => {
        const lineOmzet =
          t.transaction_lines?.reduce(
            (s, l) => s + (l.line_omzet || 0),
            0
          ) || 0;
        return sum + lineOmzet;
      }, 0);
    return calculateBonusesAvailable(
      allLunasOmzet,
      customer.bonus_threshold,
      customer.bonuses_already_granted
    );
  }, [customer, transactions]);

  // Piutang transactions for settle month
  const piutangInMonth = useMemo(() => {
    return filteredTransactions.filter((t) => t.status === "Piutang");
  }, [filteredTransactions]);

  const handleSettleMonth = () => {
    if (piutangInMonth.length === 0) return;
    setSettleTarget({
      type: "month",
      ids: piutangInMonth.map((t) => t.id),
    });
    setTanggalLunas(new Date().toISOString().split("T")[0]);
    setSettleDialogOpen(true);
  };

  const handleSettleSingle = (txId: string) => {
    setSettleTarget({ type: "single", ids: [txId] });
    setTanggalLunas(new Date().toISOString().split("T")[0]);
    setSettleDialogOpen(true);
  };

  const handleConfirmSettle = async () => {
    if (!settleTarget) return;
    setSettling(true);

    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          status: "Lunas",
          tanggal_lunas: tanggalLunas,
        })
        .in("id", settleTarget.ids);

      if (error) throw error;

      // Update local state
      setTransactions((prev) =>
        prev.map((t) =>
          settleTarget.ids.includes(t.id)
            ? { ...t, status: "Lunas", tanggal_lunas: tanggalLunas }
            : t
        )
      );

      setSettleDialogOpen(false);
      toast.success(
        `${settleTarget.ids.length} transaksi ditandai Lunas`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal mengubah status", {
        description: message,
      });
    } finally {
      setSettling(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!customer) return;
    try {
      await generateCustomerReportPDF({
        customer,
        transactions: filteredTransactions,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
      });
      toast.success("PDF berhasil diunduh");
    } catch {
      toast.error("Gagal membuat PDF");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-stone-200 animate-pulse" />
          <div>
            <div className="h-6 w-48 bg-stone-200 rounded animate-pulse" />
            <div className="h-4 w-32 bg-stone-100 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 p-5">
              <div className="h-3 w-20 bg-stone-200 rounded animate-pulse mb-2" />
              <div className="h-7 w-28 bg-stone-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 p-5">
          <div className="h-5 w-40 bg-stone-200 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-full bg-stone-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-stone-400 dark:text-stone-500">
        <Users className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">Pelanggan tidak ditemukan</p>
        <Link href="/customers">
          <Button variant="link" className="mt-2">
            Kembali ke daftar pelanggan
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">
              {customer.nama}
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              Detail pelanggan dan riwayat transaksi
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateReport}
            disabled={filteredTransactions.length === 0}
            className="h-9 text-sm"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Customer Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="min-h-[100px]">
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium uppercase tracking-wide">
                Diskon LM
              </p>
              <div className="mt-2">
                {customer.diskon_lm.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {customer.diskon_lm.map((d, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs bg-indigo-50 text-indigo-700"
                      >
                        {d}%
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-stone-400 dark:text-stone-500">Tidak ada</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[100px]">
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium uppercase tracking-wide">
                Diskon BR
              </p>
              <div className="mt-2">
                {customer.diskon_br.length > 0 ? (
                  <div className="flex gap-1 flex-wrap">
                    {customer.diskon_br.map((d, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs bg-purple-50 text-purple-700"
                      >
                        {d}%
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-stone-400 dark:text-stone-500">Tidak ada</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="min-h-[100px]">
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <div>
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium uppercase tracking-wide">
                Bonus Threshold
              </p>
              <p className="text-lg font-bold text-stone-900 dark:text-stone-50 mt-2">
                {formatIDR(customer.bonus_threshold)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`min-h-[100px] ${
            bonusesAvailable > 0
              ? "border-yellow-300 bg-yellow-50/50"
              : ""
          }`}
        >
          <CardContent className="p-4 h-full flex flex-col justify-between">
            <div className="flex items-start gap-2">
              {bonusesAvailable > 0 && (
                <Gift className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium uppercase tracking-wide">
                  Bonus Tersedia
                </p>
                <p
                  className={`text-lg font-bold mt-2 ${
                    bonusesAvailable > 0
                      ? "text-yellow-700"
                      : "text-stone-900 dark:text-stone-50"
                  }`}
                >
                  {bonusesAvailable}
                </p>
                <p className="text-[11px] text-stone-400 dark:text-stone-500">
                  Sudah diberikan: {customer.bonuses_already_granted}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Month/Year Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-stone-500 dark:text-stone-400">Bulan</Label>
                <Select
                  value={selectedMonth}
                  onValueChange={(v) => setSelectedMonth(v || "1")}
                >
                  <SelectTrigger className="h-9 w-40 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem
                        key={m.value}
                        value={m.value.toString()}
                      >
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-stone-500 dark:text-stone-400">Tahun</Label>
                <Select
                  value={selectedYear}
                  onValueChange={(v) =>
                    setSelectedYear(
                      v || new Date().getFullYear().toString()
                    )
                  }
                >
                  <SelectTrigger className="h-9 w-28 text-sm">
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
            {piutangInMonth.length > 0 && (
              <Button
                onClick={handleSettleMonth}
                className="h-9 text-sm bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                Lunasi Semua ({piutangInMonth.length})
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2.5">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Omzet Lunas</p>
                <p className="text-lg font-bold text-stone-900 dark:text-stone-50">
                  {formatIDR(stats.omzetLunas)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2.5">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Sudah Dibayar</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatIDR(stats.sudahDibayar)}
                </p>
                <p className="text-[11px] text-stone-400 dark:text-stone-500">
                  {stats.lunasCount} transaksi
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-orange-100 p-2.5">
                <TrendingDown className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Piutang</p>
                <p className="text-lg font-bold text-orange-600">
                  {formatIDR(stats.piutang)}
                </p>
                <p className="text-[11px] text-stone-400 dark:text-stone-500">
                  {stats.piutangCount} transaksi
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2.5">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Omzet LM</p>
                <p className="text-lg font-bold text-indigo-600">
                  {formatIDR(stats.omzetLM)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2.5">
                <TrendingUp className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Omzet BR</p>
                <p className="text-lg font-bold text-purple-600">
                  {formatIDR(stats.omzetBR)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-emerald-50 p-2.5">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Laba HL Lunas</p>
                <p className="text-lg font-bold text-emerald-600">
                  {formatIDR(stats.labaLunas)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                Riwayat Transaksi
              </CardTitle>
              <CardDescription className="text-sm">
                {filteredTransactions.length} transaksi di bulan ini
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTransactions.length === 0 ? (
            <div className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
              Tidak ada transaksi di bulan ini
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50/80 dark:bg-stone-800/60">
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                      Tanggal
                    </TableHead>
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                      No. Bon
                    </TableHead>
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                      Status
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                      Total
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                      Aksi
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((t) => {
                    const lineOmzet =
                      t.transaction_lines?.reduce(
                        (sum, l) =>
                          sum + (l.line_omzet || 0),
                        0
                      ) || 0;
                    const total = lineOmzet + (t.ongkir || 0);

                    return (
                      <TableRow
                        key={t.id}
                        className={`hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors ${
                          t.status === "Lunas" ? "bg-green-50/30" : ""
                        }`}
                      >
                        <TableCell className="text-sm">
                          {format(
                            new Date(t.tanggal),
                            "dd MMM yyyy",
                            { locale: localeID }
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded">
                              {t.nomor_bon}
                            </span>
                            {t.is_bonus && (
                              <Badge
                                variant="secondary"
                                className="text-xs bg-yellow-50 text-yellow-700"
                              >
                                Bonus
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              t.status === "Lunas"
                                ? "bg-green-50 text-green-700"
                                : "bg-orange-50 text-orange-700"
                            }`}
                          >
                            {t.status}
                          </Badge>
                          {t.tanggal_lunas && (
                            <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
                              {format(
                                new Date(t.tanggal_lunas),
                                "dd MMM",
                                { locale: localeID }
                              )}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatIDR(total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/transactions/${t.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-stone-500 dark:text-stone-400 hover:text-indigo-600"
                                title="Lihat detail"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {t.status === "Piutang" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-emerald-600 dark:text-emerald-400 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleSettleSingle(t.id)}
                                title="Tandai Lunas"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settle Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tandai Lunas</DialogTitle>
            <DialogDescription>
              {settleTarget?.type === "month"
                ? `Lunasi ${settleTarget.ids.length} transaksi di bulan ini`
                : "Pilih tanggal pelunasan"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="tanggal_lunas" className="text-sm">
                Tanggal Pelunasan
              </Label>
              <Input
                id="tanggal_lunas"
                type="date"
                value={tanggalLunas}
                onChange={(e) => setTanggalLunas(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSettleDialogOpen(false)}
              disabled={settling}
              className="h-9 text-sm"
            >
              Batal
            </Button>
            <Button
              onClick={handleConfirmSettle}
              disabled={settling}
              className="h-9 text-sm bg-green-600 hover:bg-green-700"
            >
              {settling
                ? "Memproses..."
                : `Konfirmasi (${settleTarget?.ids.length || 0})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
