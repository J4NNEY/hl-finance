"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Eye, Users, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CustomerDialog } from "./components/customer-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Pagination } from "@/components/shared/pagination";
import { exportCustomers } from "@/lib/utils/export";
import { formatIDR } from "@/lib/utils/currency";
import { toast } from "sonner";
import Link from "next/link";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;
  const supabase = createClient();

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("is_deleted", false)
        .order("nama");

      if (error) throw error;
      setCustomers(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal memuat data pelanggan", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchCustomers(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchCustomers]);

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const handleExport = () => {
    try {
      exportCustomers(customers);
      toast.success("Unduhan berhasil", {
        description: `${customers.length} pelanggan diunduh ke Excel/CSV`,
      });
    } catch {
      toast.error("Gagal mengunduh data");
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from("customers")
        .update({ is_deleted: true })
        .eq("id", selectedCustomer.id);

      if (error) throw error;

      toast.success("Pelanggan berhasil dihapus", {
        description: `${selectedCustomer.nama} telah dihapus dari daftar`,
      });
      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
      await fetchCustomers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal menghapus pelanggan", {
        description: message,
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedCustomer(null);
    fetchCustomers();
  };

  const filteredCustomers = customers.filter((c) =>
    c.nama.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCustomers.length / PAGE_SIZE);
  const effectiveCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginatedCustomers = filteredCustomers.slice(
    (effectiveCurrentPage - 1) * PAGE_SIZE,
    effectiveCurrentPage * PAGE_SIZE
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Pelanggan</h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Kelola data pelanggan dan konfigurasi diskon
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={customers.length === 0}
            className="h-9 text-sm"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Unduh
          </Button>
          <Button
            onClick={() => {
              setSelectedCustomer(null);
              setDialogOpen(true);
            }}
            className="h-9 text-sm bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Tambah
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                Daftar Pelanggan
              </CardTitle>
              <CardDescription className="text-sm">
                {customers.length} pelanggan terdaftar
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
              <Input
                placeholder="Cari pelanggan..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="h-9 pl-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4">
              <TableSkeleton rows={6} columns={5} />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400 dark:text-stone-500">
              <Users className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">
                {search ? "Pelanggan tidak ditemukan" : "Belum ada pelanggan"}
              </p>
              {!search && (
                <Button
                  variant="link"
                  onClick={() => setDialogOpen(true)}
                  className="mt-1 text-sm"
                >
                  Tambah pelanggan pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50/80 dark:bg-stone-800/60">
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Nama</TableHead>
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Diskon Lemari (LM)</TableHead>
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Diskon Bukan Lemari (BR)</TableHead>
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Batas Bonus</TableHead>
                    <TableHead className="text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCustomers.map((customer) => (
                    <TableRow key={customer.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-sm font-semibold shrink-0">
                            {customer.nama.charAt(0)}
                          </div>
                          <span className="font-medium text-sm">{customer.nama}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.diskon_lm.length > 0
                          ? customer.diskon_lm.map((d, i) => (
                              <Badge key={i} variant="secondary" className="mr-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
                                {d}%
                              </Badge>
                            ))
                          : <span className="text-xs text-stone-400 dark:text-stone-500">-</span>}
                      </TableCell>
                      <TableCell>
                        {customer.diskon_br.length > 0
                          ? customer.diskon_br.map((d, i) => (
                              <Badge key={i} variant="secondary" className="mr-1 text-xs bg-purple-50 text-purple-700 hover:bg-purple-50">
                                {d}%
                              </Badge>
                            ))
                          : <span className="text-xs text-stone-400 dark:text-stone-500">-</span>}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatIDR(customer.bonus_threshold)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/customers/${customer.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-stone-500 dark:text-stone-400 hover:text-indigo-600" title="Lihat detail">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-stone-500 dark:text-stone-400 hover:text-indigo-600"
                            onClick={() => handleEdit(customer)}
                            title="Edit pelanggan"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-stone-500 dark:text-stone-400 hover:text-red-600"
                            onClick={() => handleDelete(customer)}
                            title="Hapus pelanggan"
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
                totalItems={filteredCustomers.length}
                pageSize={PAGE_SIZE}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <CustomerDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        customer={selectedCustomer}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Pelanggan"
        description={`Yakin ingin menghapus "${selectedCustomer?.nama}"? Data transaksi lama tetap tersimpan dan pelanggan tidak akan muncul di pilihan baru.`}
        type="danger"
        confirmText="Hapus"
        loading={deleting}
      />
    </div>
  );
}
