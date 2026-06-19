"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  BarChart3,
} from "lucide-react";

const icons = {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  BarChart3,
};

const navItems = [
  {
    section: "Menu",
    items: [
      { title: "Beranda", href: "/", icon: "LayoutDashboard" },
      { title: "Pelanggan", href: "/customers", icon: "Users" },
      { title: "Produk", href: "/products", icon: "Package" },
    ],
  },
  {
    section: "Penjualan",
    items: [
      { title: "Transaksi", href: "/transactions", icon: "FileText" },
      { title: "Laporan", href: "/reports", icon: "BarChart3" },
    ],
  },
];

export function SidebarContent() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full relative" style={{ background: "var(--sidebar)" }}>
      {/* Subtle grain texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Logo */}
      <div className="relative px-5 pt-7 pb-6">
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[13px] font-extrabold text-white tracking-tight transition-all duration-200 group-hover:scale-105 group-hover:shadow-lg"
            style={{
              background: "linear-gradient(145deg, #6366f1, #4338ca)",
              boxShadow: "0 4px 14px rgba(99,102,241,0.35), 0 1px 3px rgba(0,0,0,0.12)",
            }}
          >
            HL
          </div>
          <div>
            <span className="text-[15px] font-bold text-stone-100 tracking-tight">
              HL Finance
            </span>
            <p className="text-[10px] text-stone-500 mt-0.5 leading-none tracking-wide">
              Kelola Penjualan
            </p>
          </div>
        </Link>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6" role="navigation" aria-label="Menu utama">
        {navItems.map((section, si) => (
          <div key={section.section} className={si > 0 ? "mt-8" : ""}>
            <p className="px-4 mb-3 text-[10px] font-semibold text-stone-500 uppercase tracking-[0.16em]">
              {section.section}
            </p>
            <div className="space-y-[3px]">
              {section.items.map((item) => {
                const Icon = icons[item.icon as keyof typeof icons];
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-[8px] px-3 py-[10px] text-[13px] font-medium transition-all duration-150",
                      isActive
                        ? "bg-white/[0.08] text-white"
                        : "text-stone-500 hover:text-stone-300 hover:bg-white/[0.04]"
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                        style={{
                          background: "linear-gradient(180deg, #818cf8, #6366f1)",
                          boxShadow: "0 0 10px rgba(129,140,248,0.4)",
                        }}
                      />
                    )}

                    <Icon
                      className={cn(
                        "h-[18px] w-[18px] transition-colors shrink-0",
                        isActive ? "text-indigo-400" : "text-stone-600"
                      )}
                    />
                    <span className="flex-1">{item.title}</span>

                    {/* Active dot */}
                    {isActive && (
                      <div
                        className="h-[5px] w-[5px] rounded-full bg-indigo-400"
                        style={{ boxShadow: "0 0 8px rgba(129,140,248,0.5)" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="relative px-5 py-5">
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent mb-4" />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-stone-600 font-medium tracking-wide">
            HL Finance
          </p>
          <p className="text-[10px] text-stone-700 font-mono">
            v1.0
          </p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-[260px] shrink-0 lg:block">
      <SidebarContent />
    </aside>
  );
}
