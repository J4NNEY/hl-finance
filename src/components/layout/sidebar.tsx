"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
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

interface SidebarContentProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function SidebarContent({ collapsed = false, onToggleCollapse }: SidebarContentProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--sidebar)" }}>
      {/* Logo */}
      <div className={cn("relative shrink-0", collapsed ? "px-3 pt-5 pb-4" : "px-5 pt-6 pb-5")}>
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.08] text-[11px] font-bold text-white/90 tracking-tight shrink-0">
            HL
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <span className="text-[14px] font-semibold text-white/90 tracking-tight block">
                HL Finance
              </span>
              <p className="text-[11px] text-white/30 leading-none mt-0.5">
                Sales & Receivables
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* Separator */}
      <div className={cn("shrink-0", collapsed ? "mx-3" : "mx-5")}>
        <div className="h-px bg-white/[0.06]" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4" role="navigation" aria-label="Menu utama">
        {navItems.map((section, si) => (
          <div key={section.section} className={cn(si > 0 && "mt-6")}>
            <p
              className={cn(
                "mb-2 text-[10px] font-medium text-white/25 uppercase tracking-[0.12em]",
                collapsed ? "px-3 text-center" : "px-5"
              )}
            >
              {collapsed ? "—" : section.section}
            </p>
            <div className={cn("space-y-0.5", collapsed ? "px-2" : "px-3")}>
              {section.items.map((item) => {
                const Icon = icons[item.icon as keyof typeof icons];
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "relative flex items-center rounded-md transition-colors duration-150",
                      collapsed
                        ? "justify-center h-9 w-9 mx-auto"
                        : "gap-3 px-3 py-[8px]",
                      isActive
                        ? "bg-white/[0.06] text-white/90"
                        : "text-white/40 hover:text-white/60 hover:bg-white/[0.03]"
                    )}
                  >
                    <Icon
                      className={cn(
                        "shrink-0 transition-colors duration-150",
                        collapsed ? "h-[18px] w-[18px]" : "h-[17px] w-[17px]",
                        isActive ? "text-white/80" : "text-white/35"
                      )}
                    />
                    {!collapsed && (
                      <span className={cn(
                        "text-[13px] truncate transition-colors duration-150",
                        isActive ? "font-medium" : "font-normal"
                      )}>
                        {item.title}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0">
        <div className={cn("h-px bg-white/[0.06]", collapsed ? "mx-3" : "mx-5")} />
        <div className={cn(
          "flex items-center py-4",
          collapsed ? "justify-center px-2" : "justify-between px-5"
        )}>
          {!collapsed && (
            <p className="text-[10px] text-white/20 font-medium tracking-wide">
              HL Finance v1.0
            </p>
          )}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className={cn(
                "flex items-center justify-center rounded-md text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-colors duration-150",
                collapsed ? "h-8 w-8" : "h-7 w-7"
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-[16px] w-[16px]" />
              ) : (
                <PanelLeftClose className="h-[16px] w-[16px]" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden shrink-0 transition-[width] duration-200 ease-in-out lg:block",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      <SidebarContent collapsed={collapsed} onToggleCollapse={onToggleCollapse} />
    </aside>
  );
}
