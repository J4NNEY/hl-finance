"use client";

import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";

interface SuccessAnimationProps {
  message: string;
  onComplete?: () => void;
}

export function SuccessAnimation({ message, onComplete }: SuccessAnimationProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/40 backdrop-blur-sm">
      <div className="animate-scale-in bg-white dark:bg-stone-900 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
        <div className="animate-bounce">
          <CheckCircle className="h-16 w-16 text-emerald-500" />
        </div>
        <p className="text-lg font-semibold text-stone-800 dark:text-stone-100">{message}</p>
      </div>
    </div>
  );
}
