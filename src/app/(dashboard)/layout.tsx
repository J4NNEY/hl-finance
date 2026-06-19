"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { useAutoLogout } from "@/hooks/use-auto-logout";
import { useGlobalShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { SkipToContent } from "@/components/shared/skip-to-content";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAutoLogout({ timeoutMinutes: 30, warningMinutes: 5 });
  useGlobalShortcuts();

  return (
    <div className="flex h-screen bg-stone-50/50 dark:bg-stone-950/50">
      <SkipToContent />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Navbar />
        <main id="main-content" className="flex-1 overflow-y-auto" role="main">
          <div className="mx-auto max-w-[1400px] px-5 py-6 sm:px-7 lg:px-10">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
