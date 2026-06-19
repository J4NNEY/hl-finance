"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Customer, Product } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  calculateDiscountedPrice,
  calculateLineOmzet,
  calculateLineLaba,
  roundForStorage,
  formatIDR,
} from "@/lib/utils/currency";

interface LineItem {
  product_id: string;
  quantity: number;
  product?: Product;
  discounted_price?: number;
  line_omzet?: number;
  line_laba?: number;
}

export default function EditTransactionPage() {
  const params = useParams();
  const router = useRouter();
  const transactionId = params.id as string;
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [nomorBon, setNomorBon] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [ongkir, setOngkir] = useState("0");
  const [deskripsi, setDeskripsi] = useState("");
  const [isBonus, setIsBonus] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([
    { product_id: "", quantity: 1 },
  ]);
  const [originalNomorBon, setOriginalNomorBon] = useState("");
  const [originalIsBonus, setOriginalIsBonus] = useState(false);
  const [originalLineCount, setOriginalLineCount] = useState(0);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch transaction, customers, products in parallel
        const [txRes, custRes, prodRes] = await Promise.all([
          supabase
            .from("transactions")
            .select("*")
            .eq("id", transactionId)
            .single(),
          supabase
            .from("customers")
            .select("*")
            .eq("is_deleted", false)
            .order("nama"),
          supabase
            .from("products")
            .select("*")
            .eq("is_deleted", false)
            .order("nama"),
        ]);

        if (txRes.error) throw txRes.error;
        const tx = txRes.data;

        setCustomers(custRes.data || []);
        setProducts(prodRes.data || []);

        // Set form state from existing transaction
        setNomorBon(tx.nomor_bon);
        setOriginalNomorBon(tx.nomor_bon);
        setTanggal(tx.tanggal);
        setCustomerId(tx.customer_id);
        setOngkir(tx.ongkir?.toString() || "0");
        setDeskripsi(tx.deskripsi || "");
        setIsBonus(tx.is_bonus || false);
        setOriginalIsBonus(tx.is_bonus || false);

        // Fetch transaction lines
        const { data: txLines } = await supabase
          .from("transaction_lines")
          .select("*")
          .eq("transaction_id", transactionId);

        setOriginalLineCount(txLines?.length || 0);

        if (txLines && txLines.length > 0) {
          const cust = custRes.data?.find((c) => c.id === tx.customer_id);
          const loadedLines: LineItem[] = txLines.map((line) => {
            const product = prodRes.data?.find(
              (p) => p.id === line.product_id
            );
            let discountedPrice = line.discounted_unit_price;
            let lineOmzet = line.line_omzet;
            let lineLaba = line.line_laba;

            // Recalculate if not bonus
            if (!tx.is_bonus && product && cust) {
              const discountSteps =
                product.tipe === "LM"
                  ? cust.diskon_lm
                  : cust.diskon_br;
              discountedPrice = roundForStorage(
                calculateDiscountedPrice(product.harga_base, discountSteps)
              );
              lineOmzet = roundForStorage(
                calculateLineOmzet(discountedPrice, line.quantity)
              );
              lineLaba = roundForStorage(
                calculateLineLaba(
                  discountedPrice,
                  product.harga_modal,
                  line.quantity
                )
              );
            }

            return {
              product_id: line.product_id,
              quantity: line.quantity,
              product: product || undefined,
              discounted_price: discountedPrice,
              line_omzet: lineOmzet,
              line_laba: lineLaba,
            };
          });
          setLines(loadedLines);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Terjadi kesalahan";
        toast.error("Gagal memuat data transaksi", {
          description: message,
        });
        router.push("/transactions");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [transactionId, supabase, router]);

  // Recalculate line values when customer or products change
  useEffect(() => {
    if (!selectedCustomer || isBonus) return;

    const updatedLines = lines.map((line) => {
      const product = products.find((p) => p.id === line.product_id);
      if (!product || !line.quantity) return line;

      const discountSteps =
        product.tipe === "LM"
          ? selectedCustomer.diskon_lm
          : selectedCustomer.diskon_br;

      const discountedPrice = roundForStorage(
        calculateDiscountedPrice(product.harga_base, discountSteps)
      );
      const lineOmzet = roundForStorage(
        calculateLineOmzet(discountedPrice, line.quantity)
      );
      const lineLaba = roundForStorage(
        calculateLineLaba(discountedPrice, product.harga_modal, line.quantity)
      );

      return {
        ...line,
        product,
        discounted_price: discountedPrice,
        line_omzet: lineOmzet,
        line_laba: lineLaba,
      };
    });

    setLines(updatedLines); // eslint-disable-line react-hooks/set-state-in-effect
  }, [customerId, products, selectedCustomer, isBonus]); // eslint-disable-line react-hooks/exhaustive-deps

  const recalculateLine = (index: number) => {
    if (!selectedCustomer || isBonus) return;

    const line = lines[index];
    const product = products.find((p) => p.id === line.product_id);
    if (!product) return;

    const discountSteps =
      product.tipe === "LM"
        ? selectedCustomer.diskon_lm
        : selectedCustomer.diskon_br;

    const discountedPrice = roundForStorage(
      calculateDiscountedPrice(product.harga_base, discountSteps)
    );
    const lineOmzet = roundForStorage(
      calculateLineOmzet(discountedPrice, line.quantity)
    );
    const lineLaba = roundForStorage(
      calculateLineLaba(discountedPrice, product.harga_modal, line.quantity)
    );

    const newLines = [...lines];
    newLines[index] = {
      ...line,
      product,
      discounted_price: discountedPrice,
      line_omzet: lineOmzet,
      line_laba: lineLaba,
    };
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { product_id: "", quantity: 1 }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) {
      toast.error("Minimal 1 produk dalam bon");
      return;
    }
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLineProduct = (index: number, productId: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], product_id: productId };
    setLines(newLines);
    setTimeout(() => recalculateLine(index), 0);
  };

  const updateLineQuantity = (index: number, quantity: number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], quantity };
    setLines(newLines);
    setTimeout(() => recalculateLine(index), 0);
  };

  // Calculate totals
  const totalOmzet = lines.reduce((sum, l) => sum + (l.line_omzet || 0), 0);
  const totalLaba = lines.reduce((sum, l) => sum + (l.line_laba || 0), 0);
  const ongkirNum = parseFloat(ongkir) || 0;
  const totalTagihan = totalOmzet + ongkirNum;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!nomorBon.trim()) {
      toast.error("Nomor bon wajib diisi");
      return;
    }

    if (!customerId) {
      toast.error("Pelanggan wajib dipilih");
      return;
    }

    const validLines = lines.filter((l) => l.product_id && l.quantity >= 1);
    if (validLines.length === 0) {
      toast.error("Minimal 1 produk dengan quantity >= 1");
      return;
    }

    setSaving(true);

    // Check if nomor_bon changed and already exists
    if (nomorBon.toUpperCase() !== originalNomorBon) {
      const { data: existingBon } = await supabase
        .from("transactions")
        .select("id")
        .eq("nomor_bon", nomorBon.toUpperCase())
        .single();

      if (existingBon) {
        toast.error("Nomor bon sudah digunakan");
        setSaving(false);
        return;
      }
    }

    // Bonus validation when changing TO bonus
    if (isBonus && !originalIsBonus) {
      const { data: custData } = await supabase
        .from("customers")
        .select("bonuses_already_granted, bonus_threshold")
        .eq("id", customerId)
        .single();

      if (custData) {
        const { data: lunasTxs } = await supabase
          .from("transactions")
          .select("id")
          .eq("customer_id", customerId)
          .eq("status", "Lunas")
          .eq("is_bonus", false);

        let accumulatedOmzet = 0;
        if (lunasTxs && lunasTxs.length > 0) {
          const txIds = lunasTxs.map((t) => t.id);
          const { data: lunasLines } = await supabase
            .from("transaction_lines")
            .select("line_omzet, transaction_id")
            .in("transaction_id", txIds);
          accumulatedOmzet =
            lunasLines?.reduce((sum, l) => sum + (l.line_omzet || 0), 0) || 0;
        }

        const threshold = custData.bonus_threshold || 1;
        const available =
          Math.floor(accumulatedOmzet / threshold) -
          (custData.bonuses_already_granted || 0);

        if (available <= 0) {
          toast.error("Pelanggan ini tidak memiliki bonus tersedia");
          setSaving(false);
          return;
        }

        if (validLines.length > available) {
          toast.error(
            `Bonus tersedia hanya ${available}, tidak bisa memberikan ${validLines.length}`
          );
          setSaving(false);
          return;
        }
      }
    }

    // Update transaction — reset to Piutang if it was Lunas (PRD OQ-2)
    const { data: currentTx } = await supabase
      .from("transactions")
      .select("status")
      .eq("id", transactionId)
      .single();

    const shouldResetStatus = currentTx?.status === "Lunas";

    const { error: txError } = await supabase
      .from("transactions")
      .update({
        nomor_bon: nomorBon.toUpperCase(),
        tanggal,
        customer_id: customerId,
        ongkir: ongkirNum,
        deskripsi: deskripsi || null,
        is_bonus: isBonus,
        ...(shouldResetStatus && {
          status: "Piutang",
          tanggal_lunas: null,
        }),
      })
      .eq("id", transactionId);

    if (txError) {
      toast.error("Gagal mengupdate transaksi");
      setSaving(false);
      return;
    }

    // Delete old lines and insert new ones
    await supabase
      .from("transaction_lines")
      .delete()
      .eq("transaction_id", transactionId);

    const linesData = validLines.map((line) => {
      const product = products.find((p) => p.id === line.product_id)!;
      const discountSteps =
        product.tipe === "LM"
          ? selectedCustomer!.diskon_lm
          : selectedCustomer!.diskon_br;

      return {
        transaction_id: transactionId,
        product_id: line.product_id,
        quantity: line.quantity,
        harga_base_snapshot: product.harga_base,
        diskon_snapshot: isBonus ? [] : discountSteps,
        discounted_unit_price: isBonus ? 0 : (line.discounted_price || 0),
        line_omzet: isBonus ? 0 : (line.line_omzet || 0),
        line_laba: isBonus ? 0 : (line.line_laba || 0),
      };
    });

    const { error: linesError } = await supabase
      .from("transaction_lines")
      .insert(linesData);

    if (linesError) {
      toast.error("Gagal mengupdate detail transaksi");
      setSaving(false);
      return;
    }

    // Update bonus counter if is_bonus status changed
    const bonusChanged = isBonus !== originalIsBonus;
    if (bonusChanged) {
      const { data: cust } = await supabase
        .from("customers")
        .select("bonuses_already_granted")
        .eq("id", customerId)
        .single();

      if (cust) {
        let newGranted = cust.bonuses_already_granted || 0;
        if (isBonus && !originalIsBonus) {
          // Changed TO bonus: increment
          newGranted += validLines.length;
        } else if (!isBonus && originalIsBonus) {
          // Changed FROM bonus: decrement
          newGranted = Math.max(0, newGranted - originalLineCount);
        }
        await supabase
          .from("customers")
          .update({ bonuses_already_granted: newGranted })
          .eq("id", customerId);
      }
    } else if (isBonus && originalIsBonus) {
      // Both bonus, but line count might have changed
      const lineDiff = validLines.length - originalLineCount;
      if (lineDiff !== 0) {
        const { data: cust } = await supabase
          .from("customers")
          .select("bonuses_already_granted")
          .eq("id", customerId)
          .single();
        if (cust) {
          const newGranted = Math.max(
            0,
            (cust.bonuses_already_granted || 0) + lineDiff
          );
          await supabase
            .from("customers")
            .update({ bonuses_already_granted: newGranted })
            .eq("id", customerId);
        }
      }
    }

    toast.success(
      shouldResetStatus
        ? "Transaksi diupdate. Status diubah ke Piutang."
        : "Transaksi berhasil diupdate"
    );
    router.push(`/transactions/${transactionId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href={`/transactions/${transactionId}`}>
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="page-title text-2xl">Edit Transaksi</h1>
          <p className="page-subtitle">
            Edit bon {originalNomorBon} — nilai akan dihitung ulang otomatis
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="dark:bg-stone-900">
              <CardHeader>
                <CardTitle>Informasi Bon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nomor_bon">Nomor Bon</Label>
                    <Input
                      id="nomor_bon"
                      value={nomorBon}
                      onChange={(e) => setNomorBon(e.target.value)}
                      placeholder="BON001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tanggal">Tanggal</Label>
                    <Input
                      id="tanggal"
                      type="date"
                      value={tanggal}
                      onChange={(e) => setTanggal(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Pelanggan</Label>
                  <Select
                    value={customerId}
                    onValueChange={(v) => setCustomerId(v || "")}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih pelanggan" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ongkir">Ongkir (IDR)</Label>
                    <Input
                      id="ongkir"
                      type="number"
                      min="0"
                      step="1000"
                      value={ongkir}
                      onChange={(e) => setOngkir(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 flex items-end">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="is_bonus"
                        checked={isBonus}
                        onChange={(e) => setIsBonus(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="is_bonus">Bon Bonus</Label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deskripsi">Deskripsi (Opsional)</Label>
                  <Textarea
                    id="deskripsi"
                    value={deskripsi}
                    onChange={(e) => setDeskripsi(e.target.value)}
                    placeholder="Catatan tambahan..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-stone-900">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Detail Produk</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLine}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Tambah Produk
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {lines.map((line, index) => {
                  const product = products.find(
                    (p) => p.id === line.product_id
                  );

                  return (
                    <div
                      key={index}
                      className="rounded-lg border p-4 space-y-3 dark:border-stone-800/80"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          Produk #{index + 1}
                        </span>
                        {lines.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLine(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="md:col-span-2 space-y-2">
                          <Label>Produk</Label>
                          <Select
                            value={line.product_id}
                            onValueChange={(val) =>
                              updateLineProduct(index, val || "")
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih produk" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.nama} ({p.tipe}) -{" "}
                                  {formatIDR(p.harga_base)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={line.quantity}
                            onChange={(e) =>
                              updateLineQuantity(
                                index,
                                parseInt(e.target.value) || 1
                              )
                            }
                          />
                        </div>
                      </div>

                      {product && line.discounted_price !== undefined && !isBonus && (
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">
                              Harga Setelah Diskon:
                            </span>
                            <p className="font-medium">
                              {formatIDR(line.discounted_price)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Line Omzet:
                            </span>
                            <p className="font-medium">
                              {formatIDR(line.line_omzet || 0)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              Line Laba:
                            </span>
                            <p className="font-medium text-green-600 dark:text-green-400">
                              {formatIDR(line.line_laba || 0)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            <Card className="dark:bg-stone-900">
              <CardHeader>
                <CardTitle>Ringkasan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Omzet</span>
                  <span className="font-medium">{formatIDR(totalOmzet)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ongkir</span>
                  <span className="font-medium">{formatIDR(ongkirNum)}</span>
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
                  <span className="text-muted-foreground">Total Laba</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    {formatIDR(totalLaba)}
                  </span>
                </div>

                {selectedCustomer && (
                  <>
                    <Separator />
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        Pelanggan:{" "}
                      </span>
                      <span className="font-medium">
                        {selectedCustomer.nama}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
