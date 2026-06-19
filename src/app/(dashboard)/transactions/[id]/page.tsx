"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  FileText,
  Download,
  CheckCircle2,
  Trash2,
  Pencil,
} from "lucide-react";
import { formatIDR } from "@/lib/utils/currency";
import { generateTransactionPDF } from "@/lib/utils/pdf";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";

import type { Transaction, TransactionLine, Customer, Product } from "@/types";

type TransactionLineWithProduct = TransactionLine & {
  product?: Pick<Product, "nama" | "tipe">;
};

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.id as string;
  const supabase = createClient();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [lines, setLines] = useState<TransactionLineWithProduct[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [markingLunas, setMarkingLunas] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [tanggalLunas, setTanggalLunas] = useState(
    new Date().toISOString().split("T")[0]
  );

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: tx, error: txError } = await supabase
          .from("transactions")
          .select("*")
          .eq("id", transactionId)
          .single();

        if (txError) throw txError;
        setTransaction(tx);

        const [linesRes, custRes] = await Promise.all([
          supabase
            .from("transaction_lines")
            .select(
              `
              *,
              product:products(nama, tipe)
            `
            )
            .eq("transaction_id", transactionId),
          supabase
            .from("customers")
            .select("*")
            .eq("id", tx.customer_id)
            .single(),
        ]);

        setLines(linesRes.data || []);
        setCustomer(custRes.data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Terjadi kesalahan";
        toast.error("Gagal memuat data transaksi", {
          description: message,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [transactionId, supabase]);

  const totalOmzet = lines.reduce(
    (sum, l) => sum + (l.line_omzet || 0),
    0
  );
  const totalLaba = lines.reduce(
    (sum, l) => sum + (l.line_laba || 0),
    0
  );
  const ongkir = transaction?.ongkir || 0;
  const totalTagihan = totalOmzet + ongkir;

  const handleMarkLunas = async () => {
    setMarkingLunas(true);
    try {
      const { error } = await supabase
        .from("transactions")
        .update({
          status: "Lunas",
          tanggal_lunas: tanggalLunas,
        })
        .eq("id", transactionId);

      if (error) throw error;

      if (transaction) {
        setTransaction({
          ...transaction,
          status: "Lunas",
          tanggal_lunas: tanggalLunas,
        });
      }

      setSettleDialogOpen(false);
      toast.success("Transaksi ditandai Lunas");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal mengubah status", {
        description: message,
      });
    } finally {
      setMarkingLunas(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    setDeleting(true);
    try {
      const isBonus = transaction.is_bonus;
      const isLunas = transaction.status === "Lunas";
      const customerId = transaction.customer_id;

      // Handle bonus counter changes
      if (isBonus) {
        // Deleting a bonus transaction: decrement bonuses_already_granted
        const lineCount = lines.length;
        const { data: cust } = await supabase
          .from("customers")
          .select("bonuses_already_granted")
          .eq("id", customerId)
          .single();
        if (cust) {
          await supabase
            .from("customers")
            .update({
              bonuses_already_granted: Math.max(
                0,
                (cust.bonuses_already_granted || 0) - lineCount
              ),
            })
            .eq("id", customerId);
        }
      } else if (isLunas) {
        // Deleting a Lunas non-bonus transaction: recalculate bonus validity
        const { data: cust } = await supabase
          .from("customers")
          .select("bonuses_already_granted, bonus_threshold")
          .eq("id", customerId)
          .single();

        if (cust && cust.bonus_threshold > 0 && (cust.bonuses_already_granted || 0) > 0) {
          const { data: lunasTxs } = await supabase
            .from("transactions")
            .select("id")
            .eq("customer_id", customerId)
            .eq("status", "Lunas")
            .eq("is_bonus", false)
            .neq("id", transactionId);

          let accumulatedOmzet = 0;
          if (lunasTxs && lunasTxs.length > 0) {
            const txIds = lunasTxs.map((t) => t.id);
            const { data: lunasLines } = await supabase
              .from("transaction_lines")
              .select("line_omzet")
              .in("transaction_id", txIds);
            accumulatedOmzet =
              lunasLines?.reduce((sum, l) => sum + (l.line_omzet || 0), 0) || 0;
          }

          const maxValidGrants = Math.floor(accumulatedOmzet / cust.bonus_threshold);
          if ((cust.bonuses_already_granted || 0) > maxValidGrants) {
            await supabase
              .from("customers")
              .update({ bonuses_already_granted: maxValidGrants })
              .eq("id", customerId);
          }
        }
      }

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId);

      if (error) throw error;

      toast.success("Transaksi berhasil dihapus");
      router.push("/transactions");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal menghapus transaksi", {
        description: message,
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!transaction || !customer) return;
    try {
      await generateTransactionPDF({ transaction, lines, customer });
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
            <div className="h-6 w-40 bg-stone-200 rounded animate-pulse" />
            <div className="h-4 w-28 bg-stone-100 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-stone-200/80 bg-white p-5">
              <div className="h-3 w-20 bg-stone-200 rounded animate-pulse mb-2" />
              <div className="h-7 w-28 bg-stone-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-stone-200/80 bg-white p-5">
          <div className="h-5 w-32 bg-stone-200 rounded animate-pulse mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 w-full bg-stone-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-stone-400 dark:text-stone-500">
        <FileText className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">Transaksi tidak ditemukan</p>
        <Link href="/transactions">
          <Button variant="link" className="mt-2">
            Kembali ke daftar transaksi
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
          <Link href="/transactions">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">
                {transaction.nomor_bon}
              </h1>
              <Badge
                variant="secondary"
                className={`text-xs ${
                  transaction.status === "Lunas"
                    ? "badge-lunas"
                    : "badge-piutang"
                }`}
              >
                {transaction.status}
              </Badge>
              {transaction.is_bonus && (
                <Badge
                  variant="secondary"
                  className="text-xs badge-bonus"
                >
                  Bonus
                </Badge>
              )}
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
              {format(new Date(transaction.tanggal), "EEEE, dd MMMM yyyy", {
                locale: localeID,
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleGeneratePDF}
            className="h-9 text-sm"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Cetak Bon
          </Button>
          {transaction.status === "Piutang" && (
            <Button
              onClick={() => setSettleDialogOpen(true)}
              className="h-9 text-sm bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" />
              Tandai Lunas
            </Button>
          )}
          {!transaction.is_bonus && (
            transaction.status === "Lunas" ? (
              <Button
                variant="outline"
                className="h-9 text-sm"
                onClick={() => setEditDialogOpen(true)}
              >
                <Pencil className="mr-1.5 h-4 w-4" />
                Edit
              </Button>
            ) : (
              <Link href={`/transactions/${transactionId}/edit`}>
                <Button variant="outline" className="h-9 text-sm">
                  <Pencil className="mr-1.5 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            )
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            onClick={() => setDeleteDialogOpen(true)}
            title="Hapus transaksi"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Transaction Info */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium uppercase tracking-wide">
              Pelanggan
            </p>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-50 mt-1">
              {customer?.nama || "-"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium uppercase tracking-wide">
              Status
            </p>
            <div className="mt-1">
              <Badge
                variant="secondary"
                className={`text-xs ${
                  transaction.status === "Lunas"
                    ? "badge-lunas"
                    : "badge-piutang"
                }`}
              >
                {transaction.status}
              </Badge>
            </div>
            {transaction.tanggal_lunas && (
              <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                Lunas:{" "}
                {format(
                  new Date(transaction.tanggal_lunas),
                  "dd MMM yyyy",
                  { locale: localeID }
                )}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium uppercase tracking-wide">
              Ongkir
            </p>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-50 mt-1">
              {formatIDR(ongkir)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium uppercase tracking-wide">
              Total Tagihan
            </p>
            <p className="text-lg font-bold text-stone-900 dark:text-stone-50 mt-1">
              {formatIDR(totalTagihan)}
            </p>
          </CardContent>
        </Card>
      </div>

      {transaction.deskripsi && (
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium uppercase tracking-wide mb-1">
              Deskripsi
            </p>
            <p className="text-sm text-stone-700 dark:text-stone-200">{transaction.deskripsi}</p>
          </CardContent>
        </Card>
      )}

      {/* Transaction Lines */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-stone-400 dark:text-stone-500" />
            Detail Produk
          </CardTitle>
          <CardDescription className="text-sm">
            {lines.length} produk dalam transaksi ini
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {lines.length === 0 ? (
            <div className="py-8 text-center text-sm text-stone-400 dark:text-stone-500">
              Tidak ada detail produk
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50/80 dark:bg-stone-800/60">
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                      Produk
                    </TableHead>
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                      Tipe
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                      Harga Satuan
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                      Qty
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                      Omzet
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                      Laba
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => (
                    <TableRow
                      key={line.id}
                      className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      <TableCell className="text-sm font-medium">
                        {line.product?.nama || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            line.product?.tipe === "LM"
                              ? "badge-lm"
                              : "badge-br"
                          }`}
                        >
                          {line.product?.tipe || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-stone-500 dark:text-stone-400">
                        {formatIDR(line.discounted_unit_price)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {line.quantity}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatIDR(line.line_omzet)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        {formatIDR(line.line_laba)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ringkasan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500 dark:text-stone-400">Total Omzet</span>
            <span className="font-medium">{formatIDR(totalOmzet)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500 dark:text-stone-400">Ongkir</span>
            <span className="font-medium">{formatIDR(ongkir)}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="font-medium">Total Tagihan</span>
            <span className="text-lg font-bold">
              {formatIDR(totalTagihan)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-stone-500 dark:text-stone-400">Total Laba</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {formatIDR(totalLaba)}
            </span>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        onConfirm={() => {
          setEditDialogOpen(false);
          router.push(`/transactions/${transactionId}/edit`);
        }}
        title="Edit Bon Lunas"
        description={`Bon "${transaction.nomor_bon}" sudah berstatus Lunas. Mengedit akan mengubah status kembali ke Piutang dan menghapus tanggal pelunasan. Lanjutkan?`}
        type="warning"
        confirmText="Lanjut Edit"
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Transaksi"
        description={`Yakin ingin menghapus bon "${transaction.nomor_bon}"? Tindakan ini tidak dapat dibatalkan.`}
        type="danger"
        confirmText="Hapus"
        loading={deleting}
      />

      {/* Settle Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tandai Lunas</DialogTitle>
            <DialogDescription>
              Pilih tanggal pelunasan untuk bon &ldquo;{transaction.nomor_bon}&rdquo;
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
              disabled={markingLunas}
              className="h-9 text-sm"
            >
              Batal
            </Button>
            <Button
              onClick={handleMarkLunas}
              disabled={markingLunas}
              className="h-9 text-sm bg-green-600 hover:bg-green-700"
            >
              {markingLunas ? "Memproses..." : "Konfirmasi Lunas"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
