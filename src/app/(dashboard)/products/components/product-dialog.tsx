"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Product } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ProductDialogProps {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}

interface FormErrors {
  nama?: string;
  hargaModal?: string;
  hargaBase?: string;
}

export function ProductDialog({
  open,
  onClose,
  product,
}: ProductDialogProps) {
  const [nama, setNama] = useState("");
  const [tipe, setTipe] = useState<"LM" | "BR">("LM");
  const [hargaModal, setHargaModal] = useState("");
  const [hargaBase, setHargaBase] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const supabase = createClient();

  useEffect(() => {
    if (product) {
      setNama(product.nama); // eslint-disable-line react-hooks/set-state-in-effect
      setTipe(product.tipe);
      setHargaModal(product.harga_modal.toString());
      setHargaBase(product.harga_base.toString());
    } else {
      setNama("");
      setTipe("LM");
      setHargaModal("");
      setHargaBase("");
    }
    setErrors({});
    setTouched({});
  }, [product, open]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!nama.trim()) {
      newErrors.nama = "Nama produk wajib diisi";
    } else if (nama.trim().length < 2) {
      newErrors.nama = "Nama minimal 2 karakter";
    } else if (nama.trim().length > 100) {
      newErrors.nama = "Nama maksimal 100 karakter";
    }

    const modal = parseFloat(hargaModal);
    if (!hargaModal) {
      newErrors.hargaModal = "Harga modal wajib diisi";
    } else if (isNaN(modal) || modal < 0) {
      newErrors.hargaModal = "Harga modal tidak valid";
    }

    const base = parseFloat(hargaBase);
    if (!hargaBase) {
      newErrors.hargaBase = "Harga jual wajib diisi";
    } else if (isNaN(base) || base < 0) {
      newErrors.hargaBase = "Harga jual tidak valid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validate();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ nama: true, hargaModal: true, hargaBase: true });

    if (!validate()) {
      toast.error("Silakan perbaiki data yang salah");
      return;
    }

    setLoading(true);

    try {
      const data = {
        nama: nama.trim(),
        tipe,
        harga_modal: parseFloat(hargaModal),
        harga_base: parseFloat(hargaBase),
      };

      if (product) {
        const { error } = await supabase
          .from("products")
          .update(data)
          .eq("id", product.id);

        if (error) throw error;
        toast.success("Produk berhasil diupdate");
      } else {
        const { error } = await supabase.from("products").insert(data);

        if (error) throw error;
        toast.success("Produk berhasil ditambahkan");
      }

      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal menyimpan produk", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {product ? "Edit Produk" : "Tambah Produk"}
          </DialogTitle>
          <DialogDescription>
            {product
              ? "Ubah data produk"
              : "Tambahkan produk baru ke sistem"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama */}
          <div className="space-y-1.5">
            <Label htmlFor="nama" className="text-sm">
              Nama Produk <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nama"
              value={nama}
              onChange={(e) => {
                setNama(e.target.value);
                if (touched.nama) validate();
              }}
              onBlur={() => handleBlur("nama")}
              placeholder="Masukkan nama produk"
              className={`h-9 text-sm ${errors.nama && touched.nama ? "border-red-500" : ""}`}
              maxLength={100}
            />
            {errors.nama && touched.nama && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.nama}
              </p>
            )}
          </div>

          {/* Tipe */}
          <div className="space-y-1.5">
            <Label className="text-sm">
              Jenis Produk <span className="text-red-500">*</span>
            </Label>
            <Select
              value={tipe}
              onValueChange={(value) => setTipe((value as "LM" | "BR") || "LM")}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LM">LM (Lemari)</SelectItem>
                <SelectItem value="BR">BR (Bukan Lemari)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Harga Modal */}
          <div className="space-y-1.5">
            <Label htmlFor="harga_modal" className="text-sm">
              Harga Modal (IDR) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="harga_modal"
              type="number"
              min="0"
              step="1000"
              value={hargaModal}
              onChange={(e) => {
                setHargaModal(e.target.value);
                if (touched.hargaModal) validate();
              }}
              onBlur={() => handleBlur("hargaModal")}
              placeholder="0"
              className={`h-9 text-sm ${errors.hargaModal && touched.hargaModal ? "border-red-500" : ""}`}
            />
            {errors.hargaModal && touched.hargaModal && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.hargaModal}
              </p>
            )}
            <p className="text-[11px] text-stone-400 dark:text-stone-500">
              Harga beli barang (untuk hitung laba)
            </p>
          </div>

          {/* Harga Jual */}
          <div className="space-y-1.5">
            <Label htmlFor="harga_base" className="text-sm">
              Harga Jual (IDR) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="harga_base"
              type="number"
              min="0"
              step="1000"
              value={hargaBase}
              onChange={(e) => {
                setHargaBase(e.target.value);
                if (touched.hargaBase) validate();
              }}
              onBlur={() => handleBlur("hargaBase")}
              placeholder="0"
              className={`h-9 text-sm ${errors.hargaBase && touched.hargaBase ? "border-red-500" : ""}`}
            />
            {errors.hargaBase && touched.hargaBase && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.hargaBase}
              </p>
            )}
            <p className="text-[11px] text-stone-400 dark:text-stone-500">
              Harga sebelum diskon diterapkan
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-9 text-sm"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 text-sm bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20"
            >
              {loading ? "Menyimpan..." : product ? "Simpan Perubahan" : "Tambah Produk"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
