"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Plus, Eye, Trash2, FileText, Search, Filter, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Pagination } from "@/components/shared/pagination";
import { exportTransactions } from "@/lib/utils/export";
import { formatIDR } from "@/lib/utils/currency";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { id as localeID } from "date-fns/locale";
import type { Transaction, TransactionLine, Customer, Product } from "@/types";

type TransactionWithRelations = Transaction & {
  customer?: Pick<Customer, "nama">;
  transaction_lines?: (TransactionLine & { product?: Pick<Product, "nama" | "tipe"> })[];
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithRelations | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;
  const supabase = createClient();

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          *,
          customer:customers(nama),
          transaction_lines(
            *,
            product:products(nama, tipe)
          )
        `
        )
        .order("tanggal", { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal memuat data transaksi", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchTransactions(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchTransactions]);

  const calculateTotal = (transaction: TransactionWithRelations) => {
    const lineOmzet =
      transaction.transaction_lines?.reduce(
        (sum, l) => sum + (l.line_omzet || 0),
        0
      ) || 0;
    return lineOmzet + (transaction.ongkir || 0);
  };

  const handleDelete = (transaction: TransactionWithRelations) => {
    setSelectedTransaction(transaction);
    setDeleteDialogOpen(true);
  };

  const handleExport = () => {
    try {
      exportTransactions(transactions);
      toast.success("Export berhasil", {
        description: `${transactions.length} transaksi di-export ke CSV`,
      });
    } catch {
      toast.error("Gagal export data");
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedTransaction) return;
    setDeleting(true);

    try {
      const isBonus = selectedTransaction.is_bonus;
      const isLunas = selectedTransaction.status === "Lunas";
      const customerId = selectedTransaction.customer_id;

      // Handle bonus counter changes
      if (isBonus) {
        // Deleting a bonus transaction: decrement bonuses_already_granted
        const lineCount = selectedTransaction.transaction_lines?.length || 0;
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
        // (PRD: accumulated omzet decreases, granted bonuses might exceed new threshold)
        const { data: cust } = await supabase
          .from("customers")
          .select("bonuses_already_granted, bonus_threshold")
          .eq("id", customerId)
          .single();

        if (cust && cust.bonus_threshold > 0 && (cust.bonuses_already_granted || 0) > 0) {
          // Recalculate accumulated omzet from remaining Lunas transactions
          const { data: lunasTxs } = await supabase
            .from("transactions")
            .select("id")
            .eq("customer_id", customerId)
            .eq("status", "Lunas")
            .eq("is_bonus", false)
            .neq("id", selectedTransaction.id); // Exclude the one being deleted

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
        .eq("id", selectedTransaction.id);

      if (error) throw error;

      toast.success("Transaksi berhasil dihapus", {
        description: `Bon ${selectedTransaction.nomor_bon} telah dihapus`,
      });
      setDeleteDialogOpen(false);
      setSelectedTransaction(null);
      await fetchTransactions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal menghapus transaksi", {
        description: message,
      });
    } finally {
      setDeleting(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchSearch =
      t.nomor_bon.toLowerCase().includes(search.toLowerCase()) ||
      t.customer?.nama?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);
  const effectiveCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginatedTransactions = filteredTransactions.slice(
    (effectiveCurrentPage - 1) * PAGE_SIZE,
    effectiveCurrentPage * PAGE_SIZE
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">Transaksi</h1>
          <p className="page-subtitle">
            Kelola bon penjualan
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={transactions.length === 0}
            className="h-9 text-sm rounded-lg"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </Button>
          <Link href="/transactions/new">
            <Button className="h-9 text-sm bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 rounded-lg">
              <Plus className="mr-1.5 h-4 w-4" />
              Buat Bon
            </Button>
          </Link>
        </div>
      </div>

      {/* Table Card */}
      <Card className="bg-white border border-stone-200/60 dark:bg-stone-900 dark:border-stone-800/60 rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                Daftar Transaksi
              </CardTitle>
              <CardDescription className="text-sm">
                {transactions.length} transaksi
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
                <Input
                  placeholder="Cari..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="h-9 pl-9 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => handleStatusFilterChange(v || "all")}>
                <SelectTrigger className="h-9 w-32 text-sm">
                  <Filter className="mr-1.5 h-3.5 w-3.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="Piutang">Belum Bayar</SelectItem>
                  <SelectItem value="Lunas">Sudah Bayar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={6} columns={7} />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400 dark:text-stone-500">
              <FileText className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">
                {search || statusFilter !== "all"
                  ? "Transaksi tidak ditemukan"
                  : "Belum ada transaksi"}
              </p>
              {!search && statusFilter === "all" && (
                <Link href="/transactions/new">
                  <Button variant="link" className="mt-1 text-sm">
                    Buat bon pertama
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50/80 dark:bg-stone-800/60">
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Tanggal</TableHead>
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">No. Bon</TableHead>
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Pelanggan</TableHead>
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Jenis</TableHead>
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Status</TableHead>
                    <TableHead className="text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Total</TableHead>
                    <TableHead className="text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((t) => (
                    <TableRow key={t.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors">
                      <TableCell className="text-sm">
                        {format(new Date(t.tanggal), "dd MMM yyyy", { locale: localeID })}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded">
                          {t.nomor_bon}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {t.customer?.nama || "-"}
                      </TableCell>
                      <TableCell>
                        {t.is_bonus ? (
                          <Badge variant="secondary" className="text-xs badge-bonus">
                            Bonus
                          </Badge>
                        ) : (
                          <div className="flex gap-1">
                            {t.transaction_lines?.some((l) => l.product?.tipe === "LM") && (
                              <Badge variant="secondary" className="text-xs badge-lm">LM</Badge>
                            )}
                            {t.transaction_lines?.some((l) => l.product?.tipe === "BR") && (
                              <Badge variant="secondary" className="text-xs badge-br">BR</Badge>
                            )}
                          </div>
                        )}
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
                          {t.status === "Lunas" ? "Lunas" : "Piutang"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatIDR(calculateTotal(t))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                            <Link href={`/transactions/${t.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-stone-500 dark:text-stone-400 hover:text-indigo-600" title="Lihat detail">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-stone-500 dark:text-stone-400 hover:text-red-600"
                            onClick={() => handleDelete(t)}
                            title="Hapus transaksi"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination
                currentPage={effectiveCurrentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredTransactions.length}
                pageSize={PAGE_SIZE}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Transaksi"
        description={`Yakin ingin menghapus bon "${selectedTransaction?.nomor_bon}"? Tindakan ini tidak dapat dibatalkan.`}
        type="danger"
        confirmText="Hapus"
        loading={deleting}
      />
    </div>
  );
}
