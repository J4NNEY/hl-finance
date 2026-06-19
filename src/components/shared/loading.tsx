"use client";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

export function LoadingSpinner({ size = "md", text }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <div
          className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-stone-200 dark:border-stone-700 border-t-indigo-600 dark:border-t-indigo-400`}
        />
        <div
          className={`absolute inset-0 ${sizeClasses[size]} animate-spin rounded-full border-2 border-transparent border-t-indigo-300/30 dark:border-t-indigo-500/20`}
          style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
        />
      </div>
      {text && <p className="text-sm text-stone-500 dark:text-stone-400 font-medium">{text}</p>}
    </div>
  );
}

interface PageLoadingProps {
  text?: string;
}

export function PageLoading({ text = "Memuat data..." }: PageLoadingProps) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text={text} />
    </div>
  );
}
