"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  BarChart3,
  Plus,
  Search,
  X,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router]
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="hidden lg:flex items-center gap-2 h-8 px-3 rounded-lg border border-stone-200/80 dark:border-stone-700/80 bg-stone-50/50 dark:bg-stone-800/50 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:border-stone-300 dark:hover:border-stone-600 transition-colors cursor-pointer"
        aria-label="Buka command palette"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Cari...</span>
        <kbd className="ml-2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 px-1.5 font-mono text-[10px] font-medium text-stone-400 dark:text-stone-500">
          <span className="text-xs">&#8984;</span>K
        </kbd>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
        >
      {/* Backdrop - full screen */}
      <div
        className="fixed inset-0 bg-black/40 dark:bg-black/60 animate-fade-in"
        style={{ backdropFilter: "blur(8px)" }}
        onClick={() => setOpen(false)}
      />

      {/* Command box */}
      <div className="relative w-full max-w-lg mx-4 rounded-xl bg-white dark:bg-stone-900 shadow-2xl border border-stone-200/80 dark:border-stone-800/80 overflow-hidden animate-scale-in">
        <Command className="[&_[cmdk-input-wrapper]]:border-0 [&_[cmdk-input-wrapper]]:bg-transparent [&_[cmdk-input]]:h-12 [&_[cmdk-list]]:max-h-72 [&_[cmdk-item]]:rounded-lg [&_[cmdk-item]]:mx-1 [&_[cmdk-item]]:my-0.5">
          <div className="flex items-center border-b border-stone-100 dark:border-stone-800 px-4">
            <Search className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
            <Command.Input
              placeholder="Ketik perintah atau cari..."
              className="flex-1 h-12 px-3 text-sm bg-transparent outline-none placeholder:text-stone-400 dark:placeholder:text-stone-500 text-stone-900 dark:text-stone-100"
              autoFocus
            />
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 dark:text-stone-500 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <Command.List className="p-2 overflow-y-auto max-h-72">
            <Command.Empty className="py-6 text-center text-sm text-stone-400 dark:text-stone-500">
              Tidak ditemukan.
            </Command.Empty>

            <Command.Group
              heading="Navigasi"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-stone-400 dark:[&_[cmdk-group-heading]]:text-stone-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
            >
              <Command.Item
                onSelect={() => navigate("/")}
                className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg cursor-pointer text-stone-700 dark:text-stone-300 data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/30 data-[selected=true]:text-indigo-700 dark:data-[selected=true]:text-indigo-300 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                Beranda
              </Command.Item>
              <Command.Item
                onSelect={() => navigate("/customers")}
                className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg cursor-pointer text-stone-700 dark:text-stone-300 data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/30 data-[selected=true]:text-indigo-700 dark:data-[selected=true]:text-indigo-300 transition-colors"
              >
                <Users className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                Pelanggan
              </Command.Item>
              <Command.Item
                onSelect={() => navigate("/products")}
                className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg cursor-pointer text-stone-700 dark:text-stone-300 data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/30 data-[selected=true]:text-indigo-700 dark:data-[selected=true]:text-indigo-300 transition-colors"
              >
                <Package className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                Produk
              </Command.Item>
              <Command.Item
                onSelect={() => navigate("/transactions")}
                className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg cursor-pointer text-stone-700 dark:text-stone-300 data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/30 data-[selected=true]:text-indigo-700 dark:data-[selected=true]:text-indigo-300 transition-colors"
              >
                <FileText className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                Transaksi
              </Command.Item>
              <Command.Item
                onSelect={() => navigate("/reports")}
                className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg cursor-pointer text-stone-700 dark:text-stone-300 data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/30 data-[selected=true]:text-indigo-700 dark:data-[selected=true]:text-indigo-300 transition-colors"
              >
                <BarChart3 className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                Laporan
              </Command.Item>
            </Command.Group>

            <div className="my-1 h-px bg-stone-100 dark:bg-stone-800" />

            <Command.Group
              heading="Aksi Cepat"
              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-stone-400 dark:[&_[cmdk-group-heading]]:text-stone-500 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
            >
              <Command.Item
                onSelect={() => navigate("/transactions/new")}
                className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg cursor-pointer text-stone-700 dark:text-stone-300 data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/30 data-[selected=true]:text-indigo-700 dark:data-[selected=true]:text-indigo-300 transition-colors"
              >
                <Plus className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                Buat Bon Baru
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent("open-customer-dialog"));
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg cursor-pointer text-stone-700 dark:text-stone-300 data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/30 data-[selected=true]:text-indigo-700 dark:data-[selected=true]:text-indigo-300 transition-colors"
              >
                <Plus className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                Tambah Pelanggan
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setOpen(false);
                  window.dispatchEvent(new CustomEvent("open-product-dialog"));
                }}
                className="flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg cursor-pointer text-stone-700 dark:text-stone-300 data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-950/30 data-[selected=true]:text-indigo-700 dark:data-[selected=true]:text-indigo-300 transition-colors"
              >
                <Plus className="h-4 w-4 text-stone-400 dark:text-stone-500" />
                Tambah Produk
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
        </div>
      )}
    </>
  );
}
