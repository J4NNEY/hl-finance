"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types";
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
import { Plus, Pencil, Trash2, Package, Search, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ProductDialog } from "./components/product-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TableSkeleton } from "@/components/shared/table-skeleton";
import { Pagination } from "@/components/shared/pagination";
import { exportProducts } from "@/lib/utils/export";
import { formatIDR } from "@/lib/utils/currency";
import { toast } from "sonner";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;
  const supabase = createClient();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_deleted", false)
        .order("nama");

      if (error) throw error;
      setProducts(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal memuat data produk", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchProducts(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchProducts]);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleExport = () => {
    try {
      exportProducts(products);
      toast.success("Export berhasil", {
        description: `${products.length} produk di-export ke CSV`,
      });
    } catch {
      toast.error("Gagal export data");
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;
    setDeleting(true);

    try {
      const { error } = await supabase
        .from("products")
        .update({ is_deleted: true })
        .eq("id", selectedProduct.id);

      if (error) throw error;

      toast.success("Produk berhasil dihapus", {
        description: `${selectedProduct.nama} telah dihapus dari daftar`,
      });
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
      await fetchProducts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal menghapus produk", {
        description: message,
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedProduct(null);
    fetchProducts();
  };

  const filteredProducts = products.filter((p) =>
    p.nama.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const effectiveCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginatedProducts = filteredProducts.slice(
    (effectiveCurrentPage - 1) * PAGE_SIZE,
    effectiveCurrentPage * PAGE_SIZE
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="page-header-row">
        <div className="page-header">
          <h1 className="page-title">Produk</h1>
          <p className="page-subtitle">
            Kelola data barang dan harga
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={products.length === 0}
            className="h-9 text-sm rounded-lg"
          >
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </Button>
          <Button
            onClick={() => {
              setSelectedProduct(null);
              setDialogOpen(true);
            }}
            className="h-9 text-sm bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 rounded-lg"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Tambah
          </Button>
        </div>
      </div>

      {/* Table Card */}
      <Card className="bg-white border border-stone-200/60 dark:bg-stone-900 dark:border-stone-800/60 rounded-xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                Daftar Produk
              </CardTitle>
              <CardDescription className="text-sm">
                {products.length} produk terdaftar
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
              <Input
                placeholder="Cari produk..."
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
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-400 dark:text-stone-500">
              <Package className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium">
                {search ? "Produk tidak ditemukan" : "Belum ada produk"}
              </p>
              {!search && (
                <Button
                  variant="link"
                  onClick={() => setDialogOpen(true)}
                  className="mt-1 text-sm"
                >
                  Tambah produk pertama
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-stone-50/80 dark:bg-stone-800/60">
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Nama</TableHead>
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Jenis</TableHead>
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Harga Modal</TableHead>
                    <TableHead className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Harga Jual</TableHead>
                    <TableHead className="text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.map((product) => (
                    <TableRow key={product.id} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold shrink-0 ${
                            product.tipe === "LM" ? "bg-indigo-50 text-indigo-600" : "bg-purple-50 text-purple-600"
                          }`}>
                            {product.nama.charAt(0)}
                          </div>
                          <span className="font-medium text-sm">{product.nama}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${
                            product.tipe === "LM"
                              ? "badge-lm hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                              : "badge-br hover:bg-purple-50 dark:hover:bg-purple-950/40"
                          }`}
                        >
                          {product.tipe}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-stone-500 dark:text-stone-400">
                        {formatIDR(product.harga_modal)}
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {formatIDR(product.harga_base)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-stone-500 dark:text-stone-400 hover:text-indigo-600"
                              onClick={() => handleEdit(product)}
                            title="Edit produk"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-stone-500 dark:text-stone-400 hover:text-red-600"
                            onClick={() => handleDelete(product)}
                            title="Hapus produk"
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
                totalItems={filteredProducts.length}
                pageSize={PAGE_SIZE}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <ProductDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        product={selectedProduct}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Produk"
        description={`Yakin ingin menghapus "${selectedProduct?.nama}"? Data transaksi lama tetap tersimpan dan produk tidak akan muncul di pilihan baru.`}
        type="danger"
        confirmText="Hapus"
        loading={deleting}
      />
    </div>
  );
}
