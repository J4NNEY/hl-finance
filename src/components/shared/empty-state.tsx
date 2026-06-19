"use client";

import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4" role="status" aria-label={title}>
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-indigo-50 dark:bg-indigo-950/30 rounded-full scale-150 opacity-50" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-stone-100 dark:bg-stone-800 border-2 border-dashed border-stone-300 dark:border-stone-600">
          <div className="text-stone-400 dark:text-stone-500">{icon}</div>
        </div>
      </div>

      <h3 className="text-base font-semibold text-stone-700 dark:text-stone-200 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-stone-500 dark:text-stone-400 text-center max-w-xs mb-4">{description}</p>
      )}

      {action && (
        <Button
          variant="default"
          size="default"
          onClick={action.onClick}
          className="text-sm bg-indigo-600 hover:bg-indigo-700"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
