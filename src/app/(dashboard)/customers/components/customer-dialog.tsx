"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Customer } from "@/types";
import { customerSchema } from "@/lib/validators/customer";
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
import { Badge } from "@/components/ui/badge";
import { X, Plus, AlertCircle, ChevronUp, ChevronDown, Pencil } from "lucide-react";
import { toast } from "sonner";

interface CustomerDialogProps {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
}

interface FormErrors {
  nama?: string;
  bonusThreshold?: string;
}

function DiscountSection({
  label,
  color,
  discounts,
  newDiscount,
  onSetNewDiscount,
  onAdd,
  onRemove,
  onMoveUp,
  onMoveDown,
  onEdit,
  editingIndex,
  editValue,
  onSetEditValue,
  onConfirmEdit,
  onCancelEdit,
}: {
  label: string;
  color: "blue" | "purple";
  discounts: number[];
  newDiscount: string;
  onSetNewDiscount: (v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onMoveUp: (i: number) => void;
  onMoveDown: (i: number) => void;
  onEdit: (i: number) => void;
  editingIndex: number | null;
  editValue: string;
  onSetEditValue: (v: string) => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
}) {
  const colorClasses =
    color === "blue"
      ? "badge-lm"
      : "badge-br";

  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {discounts.length === 0 && (
          <span className="text-xs text-stone-400 dark:text-stone-500">Tidak ada diskon</span>
        )}
        {discounts.map((d, i) => (
          <div key={i} className="flex items-center gap-0.5">
            {editingIndex === i ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={editValue}
                  onChange={(e) => onSetEditValue(e.target.value)}
                  className="h-7 w-16 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onConfirmEdit();
                    }
                    if (e.key === "Escape") onCancelEdit();
                  }}
                  autoFocus
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-green-600"
                  onClick={onConfirmEdit}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-stone-400 dark:text-stone-500"
                  onClick={onCancelEdit}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Badge
                variant="secondary"
                className={`pr-0.5 ${colorClasses}`}
              >
                <span className="mr-1">{d}%</span>
                <button
                  type="button"
                  onClick={() => onEdit(i)}
                  className="mr-0.5 hover:text-stone-900 dark:hover:text-stone-50"
                  title="Edit"
                >
                  <Pencil className="h-2.5 w-2.5" />
                </button>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => onMoveUp(i)}
                    className="mr-0.5 hover:text-stone-900 dark:hover:text-stone-50"
                    title="Pindah ke atas"
                  >
                    <ChevronUp className="h-2.5 w-2.5" />
                  </button>
                )}
                {i < discounts.length - 1 && (
                  <button
                    type="button"
                    onClick={() => onMoveDown(i)}
                    className="mr-0.5 hover:text-stone-900 dark:hover:text-stone-50"
                    title="Pindah ke bawah"
                  >
                    <ChevronDown className="h-2.5 w-2.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="ml-0.5 hover:text-red-500"
                  title="Hapus"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          type="number"
          min="0"
          max="100"
          step="0.01"
          value={newDiscount}
          onChange={(e) => onSetNewDiscount(e.target.value)}
          placeholder="0-100%"
          className="h-9 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          disabled={discounts.length >= 5}
          className="h-9 px-3"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-[11px] text-stone-400 dark:text-stone-500">
        Urutan berpengaruh pada hasil akhir. Gunakan tombol panah untuk mengatur
        ulang.
      </p>
    </div>
  );
}

export function CustomerDialog({
  open,
  onClose,
  customer,
}: CustomerDialogProps) {
  const [nama, setNama] = useState("");
  const [diskonLm, setDiskonLm] = useState<number[]>([]);
  const [diskonBr, setDiskonBr] = useState<number[]>([]);
  const [bonusThreshold, setBonusThreshold] = useState("");
  const [newDiskonLm, setNewDiskonLm] = useState("");
  const [newDiskonBr, setNewDiskonBr] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [editLmIndex, setEditLmIndex] = useState<number | null>(null);
  const [editLmValue, setEditLmValue] = useState("");
  const [editBrIndex, setEditBrIndex] = useState<number | null>(null);
  const [editBrValue, setEditBrValue] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (customer) {
      setNama(customer.nama); // eslint-disable-line react-hooks/set-state-in-effect
      setDiskonLm(customer.diskon_lm || []);
      setDiskonBr(customer.diskon_br || []);
      setBonusThreshold(customer.bonus_threshold.toString());
    } else {
      setNama("");
      setDiskonLm([]);
      setDiskonBr([]);
      setBonusThreshold("");
    }
    setErrors({});
    setTouched({});
    setEditLmIndex(null);
    setEditBrIndex(null);
  }, [customer, open]);

  const validate = (): boolean => {
    const result = customerSchema.safeParse({
      nama: nama.trim(),
      diskon_lm: diskonLm,
      diskon_br: diskonBr,
      bonus_threshold: parseFloat(bonusThreshold) || 0,
    });

    if (!result.success) {
      const newErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0];
        if (field === "nama") newErrors.nama = issue.message;
        if (field === "bonus_threshold")
          newErrors.bonusThreshold = issue.message;
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validate();
  };

  const addDiskon = (
    current: number[],
    setter: (v: number[]) => void,
    newValue: string,
    clearNew: () => void
  ) => {
    const val = parseFloat(newValue);
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error("Diskon harus antara 0-100");
      return;
    }
    if (current.length >= 5) {
      toast.error("Maksimal 5 step diskon");
      return;
    }
    setter([...current, val]);
    clearNew();
  };

  const removeDiskon = (
    current: number[],
    setter: (v: number[]) => void,
    index: number
  ) => {
    setter(current.filter((_, i) => i !== index));
  };

  const moveDiskon = (
    current: number[],
    setter: (v: number[]) => void,
    from: number,
    direction: "up" | "down"
  ) => {
    const to = direction === "up" ? from - 1 : from + 1;
    if (to < 0 || to >= current.length) return;
    const arr = [...current];
    [arr[from], arr[to]] = [arr[to], arr[from]];
    setter(arr);
  };

  const startEdit = (
    index: number,
    value: number,
    setIndex: (v: number | null) => void,
    setVal: (v: string) => void
  ) => {
    setIndex(index);
    setVal(value.toString());
  };

  const confirmEdit = (
    current: number[],
    setter: (v: number[]) => void,
    index: number,
    value: string,
    clearIndex: () => void
  ) => {
    const val = parseFloat(value);
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error("Diskon harus antara 0-100");
      return;
    }
    const arr = [...current];
    arr[index] = val;
    setter(arr);
    clearIndex();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ nama: true, bonusThreshold: true });

    if (!validate()) {
      toast.error("Silakan perbaiki data yang salah");
      return;
    }

    setLoading(true);

    try {
      const data = {
        nama: nama.trim(),
        diskon_lm: diskonLm,
        diskon_br: diskonBr,
        bonus_threshold: parseFloat(bonusThreshold),
      };

      if (customer) {
        const { error } = await supabase
          .from("customers")
          .update(data)
          .eq("id", customer.id);

        if (error) throw error;
        toast.success("Pelanggan berhasil diupdate");
      } else {
        const { error } = await supabase.from("customers").insert(data);

        if (error) throw error;
        toast.success("Pelanggan berhasil ditambahkan");
      }

      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal menyimpan pelanggan", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customer ? "Edit Pelanggan" : "Tambah Pelanggan"}
          </DialogTitle>
          <DialogDescription>
            {customer
              ? "Ubah data pelanggan"
              : "Tambahkan pelanggan baru ke sistem"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nama */}
          <div className="space-y-1.5">
            <Label htmlFor="nama" className="text-sm">
              Nama Pelanggan <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nama"
              value={nama}
              onChange={(e) => {
                setNama(e.target.value);
                if (touched.nama) validate();
              }}
              onBlur={() => handleBlur("nama")}
              placeholder="Masukkan nama pelanggan"
              className={`h-9 text-sm ${errors.nama && touched.nama ? "border-red-500 focus-visible:ring-red-500" : ""}`}
              maxLength={100}
            />
            {errors.nama && touched.nama && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.nama}
              </p>
            )}
          </div>

          {/* Diskon LM */}
          <DiscountSection
            label="Diskon LM (Bertingkat)"
            color="blue"
            discounts={diskonLm}
            newDiscount={newDiskonLm}
            onSetNewDiscount={setNewDiskonLm}
            onAdd={() =>
              addDiskon(diskonLm, setDiskonLm, newDiskonLm, () =>
                setNewDiskonLm("")
              )
            }
            onRemove={(i) => removeDiskon(diskonLm, setDiskonLm, i)}
            onMoveUp={(i) => moveDiskon(diskonLm, setDiskonLm, i, "up")}
            onMoveDown={(i) => moveDiskon(diskonLm, setDiskonLm, i, "down")}
            onEdit={(i) =>
              startEdit(i, diskonLm[i], setEditLmIndex, setEditLmValue)
            }
            editingIndex={editLmIndex}
            editValue={editLmValue}
            onSetEditValue={setEditLmValue}
            onConfirmEdit={() =>
              confirmEdit(
                diskonLm,
                setDiskonLm,
                editLmIndex!,
                editLmValue,
                () => setEditLmIndex(null)
              )
            }
            onCancelEdit={() => setEditLmIndex(null)}
          />

          {/* Diskon BR */}
          <DiscountSection
            label="Diskon BR (Bertingkat)"
            color="purple"
            discounts={diskonBr}
            newDiscount={newDiskonBr}
            onSetNewDiscount={setNewDiskonBr}
            onAdd={() =>
              addDiskon(diskonBr, setDiskonBr, newDiskonBr, () =>
                setNewDiskonBr("")
              )
            }
            onRemove={(i) => removeDiskon(diskonBr, setDiskonBr, i)}
            onMoveUp={(i) => moveDiskon(diskonBr, setDiskonBr, i, "up")}
            onMoveDown={(i) => moveDiskon(diskonBr, setDiskonBr, i, "down")}
            onEdit={(i) =>
              startEdit(i, diskonBr[i], setEditBrIndex, setEditBrValue)
            }
            editingIndex={editBrIndex}
            editValue={editBrValue}
            onSetEditValue={setEditBrValue}
            onConfirmEdit={() =>
              confirmEdit(
                diskonBr,
                setDiskonBr,
                editBrIndex!,
                editBrValue,
                () => setEditBrIndex(null)
              )
            }
            onCancelEdit={() => setEditBrIndex(null)}
          />

          {/* Bonus Threshold */}
          <div className="space-y-1.5">
            <Label htmlFor="threshold" className="text-sm">
              Bonus Threshold (IDR) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="threshold"
              type="number"
              min="1"
              value={bonusThreshold}
              onChange={(e) => {
                setBonusThreshold(e.target.value);
                if (touched.bonusThreshold) validate();
              }}
              onBlur={() => handleBlur("bonusThreshold")}
              placeholder="Contoh: 10000000"
              className={`h-9 text-sm ${errors.bonusThreshold && touched.bonusThreshold ? "border-red-500 focus-visible:ring-red-500" : ""}`}
            />
            {errors.bonusThreshold && touched.bonusThreshold && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.bonusThreshold}
              </p>
            )}
            <p className="text-[11px] text-stone-400 dark:text-stone-500">
              Pelanggan mendapat bonus setiap akumulasi omzet lunas mencapai
              threshold
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
              {loading
                ? "Menyimpan..."
                : customer
                  ? "Simpan Perubahan"
                  : "Tambah Pelanggan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
