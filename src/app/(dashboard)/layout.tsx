"use client";

import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { useAutoLogout } from "@/hooks/use-auto-logout";
import { useGlobalShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { SkipToContent } from "@/components/shared/skip-to-content";

const SIDEBAR_COLLAPSED_KEY = "hl_sidebar_collapsed";

function getSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
}

function setSidebarCollapsed(value: boolean) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
  } catch {
    // ignore
  }
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAutoLogout({ timeoutMinutes: 30, warningMinutes: 5 });
  useGlobalShortcuts();

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(getSidebarCollapsed());
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      setSidebarCollapsed(next);
      return next;
    });
  }, []);

  return (
    <div className="flex h-screen bg-stone-50/50 dark:bg-stone-950/50">
      <SkipToContent />
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Navbar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
        <main id="main-content" className="flex-1 overflow-y-auto" role="main">
          <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-7 lg:px-10">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
