"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Plus, Trash2, ArrowLeft, Copy } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  calculateDiscountedPrice,
  calculateLineOmzet,
  calculateLineLaba,
  roundForStorage,
  formatIDR,
} from "@/lib/utils/currency";
import { calculateBonusesAvailable } from "@/lib/utils/bonus";

interface LineItem {
  product_id: string;
  quantity: number;
  // Computed
  product?: Product;
  discounted_price?: number;
  line_omzet?: number;
  line_laba?: number;
}

export default function NewTransactionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [nomorBon, setNomorBon] = useState("");
  const [tanggal, setTanggal] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [customerId, setCustomerId] = useState("");
  const [ongkir, setOngkir] = useState("0");
  const [deskripsi, setDeskripsi] = useState("");
  const [isBonus, setIsBonus] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([
    { product_id: "", quantity: 1 },
  ]);
  const [bonusesAvailable, setBonusesAvailable] = useState(0);

  // Selected customer for discount calculation
  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Fetch bonus availability when customer changes
  useEffect(() => {
    if (!customerId || !selectedCustomer) {
      setBonusesAvailable(0); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }

    const fetchBonusAvailability = async () => {
      // Get accumulated omzet lunas (excluding bonus transactions)
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

      const available = calculateBonusesAvailable(
        accumulatedOmzet,
        selectedCustomer.bonus_threshold,
        selectedCustomer.bonuses_already_granted
      );
      setBonusesAvailable(available);
    };

    fetchBonusAvailability();
  }, [customerId, selectedCustomer, supabase]);

  useEffect(() => {
    const fetchData = async () => {
      const [custRes, prodRes, lastBonRes] = await Promise.all([
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
        supabase
          .from("transactions")
          .select("nomor_bon")
          .order("created_at", { ascending: false })
          .limit(1)
          .single(),
      ]);

      setCustomers(custRes.data || []);
      setProducts(prodRes.data || []);

      // Auto-generate next bon number
      if (lastBonRes.data?.nomor_bon) {
        const lastBon = lastBonRes.data.nomor_bon;
        const match = lastBon.match(/^([A-Za-z]*)(\d+)$/);
        if (match) {
          const prefix = match[1] || "BON";
          const num = parseInt(match[2]) + 1;
          setNomorBon(`${prefix}${num.toString().padStart(match[2].length, "0")}`);
        } else {
          setNomorBon("BON001");
        }
      } else {
        // No transactions yet — start with BON001
        setNomorBon("BON001");
      }

      setLoading(false);
    };

    fetchData();
  }, [supabase]);

  // Recalculate line values when customer or product changes
  useEffect(() => {
    if (!selectedCustomer) return;

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
  }, [customerId, products, selectedCustomer]); // eslint-disable-line react-hooks/exhaustive-deps

  const recalculateLine = (index: number) => {
    if (!selectedCustomer) return;

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

  const duplicateLine = (index: number) => {
    const lineToCopy = lines[index];
    const newLines = [...lines];
    newLines.splice(index + 1, 0, { ...lineToCopy });
    setLines(newLines);
    toast.success("Baris produk diduplikasi");
  };

  const updateLineProduct = (index: number, productId: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], product_id: productId };
    setLines(newLines);

    // Recalculate after state update
    setTimeout(() => recalculateLine(index), 0);
  };

  const updateLineQuantity = (index: number, quantity: number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], quantity };
    setLines(newLines);

    // Recalculate
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

    // Check if nomor_bon already exists
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

    // Bonus validation: check available bonuses before creating bonus transaction
    if (isBonus) {
      const { data: custData } = await supabase
        .from("customers")
        .select("bonuses_already_granted, bonus_threshold")
        .eq("id", customerId)
        .single();

      if (!custData) {
        toast.error("Pelanggan tidak ditemukan");
        setSaving(false);
        return;
      }

      // Calculate accumulated omzet lunas for this customer
      const { data: lunasTxs } = await supabase
        .from("transactions")
        .select("id, is_bonus")
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

    // Insert transaction
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        nomor_bon: nomorBon.toUpperCase(),
        tanggal,
        customer_id: customerId,
        ongkir: ongkirNum,
        deskripsi: deskripsi || null,
        is_bonus: isBonus,
        status: "Piutang",
      })
      .select()
      .single();

    if (txError) {
      toast.error("Gagal membuat transaksi");
      setSaving(false);
      return;
    }

    // Insert transaction lines
    // For bonus transactions, omzet and laba are 0 (AC-5.7)
    const linesData = validLines.map((line) => {
      const product = products.find((p) => p.id === line.product_id)!;
      const discountSteps =
        product.tipe === "LM"
          ? selectedCustomer!.diskon_lm
          : selectedCustomer!.diskon_br;

      return {
        transaction_id: transaction.id,
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
      toast.error("Gagal menyimpan detail transaksi");
      // Cleanup
      await supabase.from("transactions").delete().eq("id", transaction.id);
      setSaving(false);
      return;
    }

    // For bonus transactions, increment bonuses_already_granted
    if (isBonus) {
      try {
        await supabase.rpc("increment_bonus_granted", {
          p_customer_id: customerId,
          p_count: validLines.length,
        });
      } catch {
        // Fallback: direct update if RPC doesn't exist
        const { data: current } = await supabase
          .from("customers")
          .select("bonuses_already_granted")
          .eq("id", customerId)
          .single();
        if (current) {
          await supabase
            .from("customers")
            .update({
              bonuses_already_granted:
                (current.bonuses_already_granted || 0) + validLines.length,
            })
            .eq("id", customerId);
        }
      }
    }

    toast.success(isBonus ? "Bon bonus berhasil dibuat" : "Bon berhasil dibuat");
    router.push("/transactions");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-stone-200 dark:bg-stone-700 animate-pulse" />
          <div>
            <div className="h-7 w-48 bg-stone-200 dark:bg-stone-700 rounded animate-pulse" />
            <div className="h-4 w-36 bg-stone-100 rounded animate-pulse mt-2" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 p-5 space-y-4">
              <div className="h-5 w-32 bg-stone-200 dark:bg-stone-700 rounded animate-pulse" />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="h-10 bg-stone-100 rounded-lg animate-pulse" />
                <div className="h-10 bg-stone-100 rounded-lg animate-pulse" />
              </div>
              <div className="h-10 bg-stone-100 rounded-lg animate-pulse" />
            </div>
            <div className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 p-5 space-y-4">
              <div className="h-5 w-28 bg-stone-200 dark:bg-stone-700 rounded animate-pulse" />
              <div className="h-24 bg-stone-100 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 p-5 space-y-3">
              <div className="h-5 w-24 bg-stone-200 dark:bg-stone-700 rounded animate-pulse" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 w-20 bg-stone-100 rounded animate-pulse" />
                  <div className="h-4 w-24 bg-stone-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="h-10 bg-stone-200 dark:bg-stone-700 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link href="/transactions">
          <Button variant="ghost" size="icon" className="rounded-lg">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="page-title text-2xl">Buat Bon Baru</h1>
          <p className="page-subtitle">
            Input transaksi penjualan baru
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informasi Bon</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nomor_bon">Nomor Bon</Label>
                    <div className="relative">
                      <Input
                        id="nomor_bon"
                        value={nomorBon}
                        readOnly
                        className="bg-stone-50 dark:bg-stone-800/60 text-stone-600 dark:text-stone-300 cursor-default pr-20"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-700 px-2 py-0.5 rounded-full">
                        Otomatis
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-400 dark:text-stone-500">
                      Nomor bon di-generate otomatis dari transaksi terakhir
                    </p>
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
                  <Select value={customerId} onValueChange={(v) => setCustomerId(v || "")}>
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

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Detail Produk</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
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
                    <div key={index} className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 p-4 space-y-3" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                            {index + 1}
                          </span>
                          <span className="text-sm font-medium text-stone-700 dark:text-stone-200">
                            Produk
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
                            onClick={() => duplicateLine(index)}
                            title="Duplikat baris"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          {lines.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-stone-400 dark:text-stone-500 hover:text-red-500"
                              onClick={() => removeLine(index)}
                              title="Hapus baris"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
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

                      {product && line.discounted_price !== undefined && (
                        <div className="rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-800 p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-stone-500 dark:text-stone-400">Harga Base</span>
                            <span className="text-stone-600 dark:text-stone-300">{formatIDR(product.harga_base)}</span>
                          </div>
                          {(() => {
                            const discountSteps = product.tipe === "LM"
                              ? selectedCustomer?.diskon_lm || []
                              : selectedCustomer?.diskon_br || [];
                            if (discountSteps.length > 0) {
                              return (
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-stone-500 dark:text-stone-400">Diskon</span>
                                  <span className="text-indigo-600 font-medium">{discountSteps.join(" → ")}%</span>
                                </div>
                              );
                            }
                            return null;
                          })()}
                          <div className="h-px bg-stone-200 dark:bg-stone-700" />
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <p className="text-[11px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Harga Diskon</p>
                              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{formatIDR(line.discounted_price)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Omzet</p>
                              <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">{formatIDR(line.line_omzet || 0)}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Laba</p>
                              <p className="text-sm font-semibold text-emerald-600">{formatIDR(line.line_laba || 0)}</p>
                            </div>
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
            <Card>
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
                    <span className="font-medium text-emerald-600">
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
                    {selectedCustomer.diskon_lm.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Diskon LM:{" "}
                        </span>
                        <span>{selectedCustomer.diskon_lm.join(" → ")}%</span>
                      </div>
                    )}
                    {selectedCustomer.diskon_br.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Diskon BR:{" "}
                        </span>
                        <span>{selectedCustomer.diskon_br.join(" → ")}%</span>
                      </div>
                    )}
                    {bonusesAvailable > 0 && (
                      <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 p-2 mt-2">
                        <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                          Bonus tersedia: {bonusesAvailable}
                        </p>
                        <p className="text-[11px] text-yellow-600 dark:text-yellow-400">
                          Threshold: {formatIDR(selectedCustomer.bonus_threshold)}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Bon"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
