"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface UseAutoLogoutOptions {
  timeoutMinutes?: number;
  warningMinutes?: number;
}

export function useAutoLogout({
  timeoutMinutes = 30,
  warningMinutes = 5,
}: UseAutoLogoutOptions = {}) {
  const router = useRouter();
  const supabase = createClient();
  const timeoutRef = useRef<NodeJS.Timeout>(undefined);
  const warningRef = useRef<NodeJS.Timeout>(undefined);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    toast.info("Sesi Anda telah habis", {
      description: "Silakan login kembali",
    });
    router.push("/login");
  }, [router, supabase]);

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);

    // Set warning timer
    warningRef.current = setTimeout(
      () => {
        toast.warning("Sesi akan berakhir", {
          description: `Anda akan logout dalam ${warningMinutes} menit jika tidak ada aktivitas`,
          duration: 10000,
        });
      },
      (timeoutMinutes - warningMinutes) * 60 * 1000
    );

    // Set logout timer
    timeoutRef.current = setTimeout(
      () => {
        handleLogout();
      },
      timeoutMinutes * 60 * 1000
    );
  }, [timeoutMinutes, warningMinutes, handleLogout]);

  useEffect(() => {
    // Events to track user activity
    const events = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    // Reset timer on any activity
    const handleActivity = () => {
      resetTimer();
    };

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Initial timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
    };
  }, [resetTimer]);

  return { resetTimer };
}
