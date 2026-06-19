import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils/currency";
import {
  Users,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Wallet,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { id as localeID } from "date-fns/locale";
import { DashboardChart } from "./components/dashboard-chart";

interface TransactionWithLines {
  id: string;
  nomor_bon: string;
  tanggal: string;
  customer_id: string;
  ongkir: number;
  is_bonus: boolean;
  status: string;
  customer?: { nama: string };
  transaction_lines?: { line_omzet: number; line_laba: number; product?: { nama: string; tipe: string } }[];
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [customersRes, productsRes, transactionsRes] = await Promise.all([
    supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("is_deleted", false),
    supabase
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
      .order("tanggal", { ascending: false }),
  ]);

  const customerCount = customersRes.count || 0;
  const productCount = productsRes.count || 0;
  const transactions: TransactionWithLines[] = transactionsRes.data || [];

  let totalPiutang = 0;
  let totalOmzetLunas = 0;
  let totalLabaLunas = 0;
  let piutangCount = 0;
  let lunasCount = 0;

  transactions.forEach((t) => {
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
      totalOmzetLunas += lineOmzet;
      totalLabaLunas += lineLaba;
      lunasCount++;
    } else {
      totalPiutang += total;
      piutangCount++;
    }
  });

  const now = new Date();
  const chartData: { month: string; omzet: number; laba: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(now, i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);

    let monthOmzet = 0;
    let monthLaba = 0;

    transactions.forEach((t) => {
      if (t.is_bonus || t.status !== "Lunas") return;
      const tDate = new Date(t.tanggal);
      if (tDate >= start && tDate <= end) {
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
        monthOmzet += lineOmzet;
        monthLaba += lineLaba;
      }
    });

    chartData.push({
      month: format(monthDate, "MMM", { locale: localeID }),
      omzet: monthOmzet,
      laba: monthLaba,
    });
  }

  const recentTransactions = transactions.slice(0, 5);

  const piutangTransactions = transactions.filter(
    (t) => t.status === "Piutang" && !t.is_bonus
  );

  const piutangByCustomer: Record<
    string,
    { nama: string; total: number; count: number }
  > = {};
  piutangTransactions.forEach((t) => {
    const custId = t.customer_id;
    const custNama = t.customer?.nama || "Unknown";
    const lineOmzet =
      t.transaction_lines?.reduce(
        (sum, l) => sum + (l.line_omzet || 0),
        0
      ) || 0;
    const total = lineOmzet + (t.ongkir || 0);

    if (!piutangByCustomer[custId]) {
      piutangByCustomer[custId] = { nama: custNama, total: 0, count: 0 };
    }
    piutangByCustomer[custId].total += total;
    piutangByCustomer[custId].count += 1;
  });

  const topPiutang = Object.values(piutangByCustomer)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const cardShadow = "0 1px 3px rgba(0,0,0,0.04)";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 tracking-tight">
            Beranda
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
            {format(new Date(), "EEEE, dd MMMM yyyy", { locale: localeID })}
          </p>
        </div>
        <Link href="/transactions/new">
          <Button className="h-9 text-sm bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-600/20">
            + Buat Bon
          </Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Pelanggan",
            value: customerCount,
            icon: Users,
            color: "indigo",
            href: "/customers",
          },
          {
            label: "Produk",
            value: productCount,
            icon: Package,
            color: "violet",
            href: "/products",
          },
          {
            label: "Sudah Dibayar",
            value: lunasCount,
            icon: CheckCircle2,
            color: "emerald",
            href: null,
          },
          {
            label: "Belum Dibayar",
            value: piutangCount,
            icon: AlertCircle,
            color: "amber",
            href: null,
          },
        ].map((stat) => {
          const Icon = stat.icon;
          const colorMap: Record<string, { bg: string; icon: string }> = {
            indigo: { bg: "bg-indigo-50 dark:bg-indigo-950/40", icon: "text-indigo-600 dark:text-indigo-400" },
            violet: { bg: "bg-violet-50 dark:bg-violet-950/40", icon: "text-violet-600 dark:text-violet-400" },
            emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/40", icon: "text-emerald-600 dark:text-emerald-400" },
            amber: { bg: "bg-amber-50 dark:bg-amber-950/40", icon: "text-amber-600 dark:text-amber-400" },
          };
          const c = colorMap[stat.color];

          const card = (
            <div
              className="group rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 p-5 transition-all duration-200 hover:border-stone-300 dark:hover:border-stone-700 hover:shadow-sm"
              style={{ boxShadow: cardShadow }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-stone-900 dark:text-stone-50 mt-2 tabular-nums">
                    {stat.value}
                  </p>
                </div>
                <div
                  className={`${c.bg} rounded-xl p-3 transition-transform duration-200 group-hover:scale-105`}
                >
                  <Icon className={`h-5 w-5 ${c.icon}`} />
                </div>
              </div>
            </div>
          );

          return stat.href ? (
            <Link key={stat.label} href={stat.href}>
              {card}
            </Link>
          ) : (
            <div key={stat.label}>{card}</div>
          );
        })}
      </div>

      {/* Financial Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div
          className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 p-5"
          style={{ boxShadow: cardShadow }}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 p-2.5">
              <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                Omzet Lunas
              </p>
              <p className="text-xl font-bold text-stone-900 dark:text-stone-50 mt-1 tabular-nums">
                {formatIDR(totalOmzetLunas)}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 p-5"
          style={{ boxShadow: cardShadow }}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-2.5">
              <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                Laba Lunas
              </p>
              <p className="text-xl font-bold text-stone-900 dark:text-stone-50 mt-1 tabular-nums">
                {formatIDR(totalLabaLunas)}
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-xl border border-amber-200/80 dark:border-amber-800/40 bg-amber-50/40 dark:bg-amber-950/20 p-5"
          style={{ boxShadow: cardShadow }}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 dark:bg-amber-900/40 p-2.5">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                Total Piutang
              </p>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
                {formatIDR(totalPiutang)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart + Recent */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div
          className="lg:col-span-3 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 p-5"
          style={{ boxShadow: cardShadow }}
        >
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200 mb-4">
            Omzet & Laba — 6 Bulan Terakhir
          </h3>
          <DashboardChart data={chartData} />
        </div>

        <div
          className="lg:col-span-2 rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 overflow-hidden"
          style={{ boxShadow: cardShadow }}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
              Transaksi Terakhir
            </h3>
            <Link href="/transactions">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-stone-500 dark:text-stone-400 px-2 gap-1"
              >
                Semua
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div>
            {recentTransactions.length === 0 ? (
              <div className="py-10 text-center text-sm text-stone-400 dark:text-stone-500">
                Belum ada transaksi
              </div>
            ) : (
              <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {recentTransactions.map((t) => {
                  const lineOmzet =
                    t.transaction_lines?.reduce(
                      (sum, l) => sum + (l.line_omzet || 0),
                      0
                    ) || 0;
                  const total = lineOmzet + (t.ongkir || 0);

                  return (
                    <Link key={t.id} href={`/transactions/${t.id}`}>
                      <div className="flex items-center justify-between px-5 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors cursor-pointer">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">
                            {t.customer?.nama || "-"}
                          </p>
                          <p className="text-xs text-stone-400 dark:text-stone-500 font-mono mt-0.5">
                            {t.nomor_bon}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 tabular-nums">
                            {formatIDR(total)}
                          </p>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] mt-0.5 ${
                              t.status === "Lunas"
                                ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                                : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                            }`}
                          >
                            {t.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Piutang */}
      {topPiutang.length > 0 && (
        <div
          className="rounded-xl border border-stone-200/80 dark:border-stone-800/80 bg-white dark:bg-stone-900 overflow-hidden"
          style={{ boxShadow: cardShadow }}
        >
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              Piutang per Pelanggan
            </h3>
            <Link href="/reports">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-stone-500 dark:text-stone-400 px-2 gap-1"
              >
                Laporan
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {topPiutang.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-5 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-xs font-bold shrink-0">
                    {item.nama.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-800 dark:text-stone-100 truncate">
                      {item.nama}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">
                      {item.count} bon
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400 tabular-nums">
                  {formatIDR(item.total)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
