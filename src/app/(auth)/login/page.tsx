"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ShieldAlert } from "lucide-react";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
const STORAGE_KEY = "hl_login_lock";

function getLockState(): { lockedUntil: number; attempts: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setLockState(state: { lockedUntil: number; attempts: number }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearLockState() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusField, setFocusField] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const startLockTimer = useCallback((until: number) => {
    setLockedUntil(until);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((until - now) / 1000));
      setRemainingSeconds(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        setLockedUntil(null);
        setAttempts(0);
        clearLockState();
      }
    }, 1000);
  }, []);

  useEffect(() => {
    const state = getLockState();
    if (state) {
      const now = Date.now();
      if (state.lockedUntil > now) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAttempts(state.attempts);
        startLockTimer(state.lockedUntil);
      } else {
        clearLockState();
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startLockTimer]);

  const isLocked = lockedUntil !== null && remainingSeconds > 0;

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m} menit ${s.toString().padStart(2, "0")} detik`;
    return `${s} detik`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_DURATION;
          setLockState({ lockedUntil: until, attempts: newAttempts });
          startLockTimer(until);
          setError(
            `Terlalu banyak percobaan gagal. Coba lagi dalam ${formatTime(
              Math.ceil(LOCKOUT_DURATION / 1000)
            )}.`
          );
        } else {
          const remaining = MAX_ATTEMPTS - newAttempts;
          setError(
            `Email atau password salah. Sisa ${remaining} percobaan.`
          );
        }
        return;
      }

      clearLockState();
      setAttempts(0);
      router.push("/");
      router.refresh();
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#f5f0eb] dark:bg-stone-950">
      {/* Background ruled lines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 39px, #e8e2db 39px, #e8e2db 40px)`,
          backgroundPosition: "0 80px",
          opacity: 0.5,
        }}
      />

      {/* Vertical margin line */}
      <div
        className="absolute top-0 bottom-0 pointer-events-none hidden lg:block"
        style={{
          left: "calc(50% - 220px)",
          width: "1px",
          background: "#d4a0a0",
          opacity: 0.3,
        }}
      />

      {/* Top decorative band */}
      <div
        className="absolute top-0 left-0 right-0 h-2"
        style={{
          background:
            "linear-gradient(90deg, #4338ca, #6366f1, #818cf8, #6366f1, #4338ca)",
        }}
      />

      {/* Main card */}
      <div className="relative w-full max-w-[420px] mx-4">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-extrabold text-white mb-4 tracking-tight"
            style={{
              background: "linear-gradient(160deg, #4338ca 0%, #6366f1 100%)",
              boxShadow:
                "0 4px 14px rgba(67,56,202,0.3), 0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            HL
          </div>
          <h1 className="text-[22px] font-extrabold text-stone-900 dark:text-stone-50 tracking-tight">
            HL Finance
          </h1>
          <p className="text-[13px] text-stone-500 dark:text-stone-400 mt-0.5">
            Kelola Penjualan & Piutang
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-2xl bg-white dark:bg-stone-900 p-8"
          style={{
            boxShadow:
              "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06), 0 24px 48px rgba(0,0,0,0.04)",
          }}
        >
          <div className="mb-7">
            <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50">Masuk</h2>
            <p className="text-[13px] text-stone-500 dark:text-stone-400 mt-1">
              Masukkan kredensial Anda untuk melanjutkan
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5" aria-label="Form login">
            {/* Error / Lockout */}
            {error && (
              <div
                className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-800/50 dark:text-red-400"
                style={{ animation: "shake 0.4s ease-in-out" }}
              >
                {error}
              </div>
            )}

            {/* Lockout banner */}
            {isLocked && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-300">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span className="text-sm font-semibold">Akun terkunci</span>
                </div>
                <p className="text-[13px] text-amber-700 dark:text-amber-300 mt-1">
                  Terlalu banyak percobaan gagal. Coba lagi dalam{" "}
                  <span className="font-semibold tabular-nums">
                    {formatTime(remainingSeconds)}
                  </span>
                </p>
                {/* Progress bar */}
                <div className="mt-2.5 h-1.5 rounded-full bg-amber-100 dark:bg-amber-900/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-1000 ease-linear"
                    style={{
                      width: `${
                        (remainingSeconds /
                          Math.ceil(LOCKOUT_DURATION / 1000)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="block text-[13px] font-semibold text-stone-700 dark:text-stone-200"
              >
                Email
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusField("email")}
                  onBlur={() => setFocusField(null)}
                  required
                  disabled={loading || isLocked}
                  className={`
                    block w-full rounded-xl border px-4 py-2.5 text-sm
                    placeholder:text-stone-400 dark:placeholder:text-stone-500
                    transition-all duration-200
                    outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${
                      focusField === "email"
                        ? "border-indigo-400 ring-[3px] ring-indigo-500/10 bg-white"
                        : "border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 hover:border-stone-300"
                    }
                  `}
                />
                <div
                  className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-indigo-500 transition-transform duration-300 origin-left"
                  style={{
                    transform:
                      focusField === "email" ? "scaleX(1)" : "scaleX(0)",
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-[13px] font-semibold text-stone-700 dark:text-stone-200"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusField("password")}
                  onBlur={() => setFocusField(null)}
                  required
                  disabled={loading || isLocked}
                  className={`
                    block w-full rounded-xl border px-4 py-2.5 text-sm
                    placeholder:text-stone-400 dark:placeholder:text-stone-500
                    transition-all duration-200
                    outline-none
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${
                      focusField === "password"
                        ? "border-indigo-400 ring-[3px] ring-indigo-500/10 bg-white"
                        : "border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 hover:border-stone-300"
                    }
                  `}
                />
                <div
                  className="absolute bottom-0 left-4 right-4 h-[2px] rounded-full bg-indigo-500 transition-transform duration-300 origin-left"
                  style={{
                    transform:
                      focusField === "password" ? "scaleX(1)" : "scaleX(0)",
                  }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || isLocked}
              className="
                relative w-full rounded-xl py-2.5 text-sm font-semibold text-white
                transition-all duration-200
                disabled:opacity-70 disabled:cursor-not-allowed
                overflow-hidden
                group
              "
              style={{
                background: isLocked
                  ? "#a8a29e"
                  : "linear-gradient(160deg, #4338ca, #4f46e5)",
                boxShadow: isLocked
                  ? "none"
                  : "0 1px 2px rgba(0,0,0,0.1), 0 4px 12px rgba(67,56,202,0.25)",
              }}
            >
              <div className="absolute inset-0 bg-white/10 transition-transform duration-500 -translate-x-full group-hover:translate-x-0" />
              <span className="relative flex items-center justify-center gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : isLocked ? (
                  `Terkunci ${formatTime(remainingSeconds)}`
                ) : (
                  "Masuk"
                )}
              </span>
            </button>

            {/* Attempt indicator */}
            {attempts > 0 && !isLocked && (
              <div className="flex justify-center gap-1.5">
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-6 rounded-full transition-colors ${
                      i < attempts ? "bg-red-400" : "bg-stone-200 dark:bg-stone-700"
                    }`}
                  />
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-[11px] text-stone-400 dark:text-stone-500 tracking-wide">
          &copy; 2025 HL Finance &middot; Aplikasi Internal
        </p>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `,
        }}
      />
    </div>
  );
}
