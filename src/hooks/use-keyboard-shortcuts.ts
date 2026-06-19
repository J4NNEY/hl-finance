"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Build shortcut string
      const parts: string[] = [];
      if (e.ctrlKey || e.metaKey) parts.push("ctrl");
      if (e.shiftKey) parts.push("shift");
      if (e.altKey) parts.push("alt");
      parts.push(e.key.toLowerCase());
      const shortcut = parts.join("+");

      // Check if shortcut exists
      if (shortcuts[shortcut]) {
        e.preventDefault();
        shortcuts[shortcut]();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

export function useGlobalShortcuts() {
  const router = useRouter();

  useKeyboardShortcuts({
    "ctrl+n": () => router.push("/transactions/new"),
    "ctrl+shift+c": () => router.push("/customers"),
    "ctrl+shift+p": () => router.push("/products"),
    "ctrl+shift+r": () => router.push("/reports"),
    "ctrl+h": () => router.push("/"),
  });
}
