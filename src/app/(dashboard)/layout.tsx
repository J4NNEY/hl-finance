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
    <div className="flex h-screen">
      <SkipToContent />
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main id="main-content" className="flex-1 overflow-y-auto" role="main">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <ErrorBoundary>{children}</ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
