"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Info, CheckCircle } from "lucide-react";

type ConfirmType = "danger" | "warning" | "info" | "success";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  type?: ConfirmType;
  confirmText?: string;
  cancelText?: string;
  requireTyping?: string; // User must type this text to confirm
  loading?: boolean;
}

const typeConfig = {
  danger: {
    icon: AlertTriangle,
    iconColor: "text-red-600 dark:text-red-400",
    iconBg: "bg-red-50 dark:bg-red-950/40",
    buttonClass: "bg-red-600 hover:bg-red-700",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-50 dark:bg-orange-950/40",
    buttonClass: "bg-orange-600 hover:bg-orange-700",
  },
  info: {
    icon: Info,
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 dark:bg-blue-950/40",
    buttonClass: "bg-blue-600 hover:bg-blue-700",
  },
  success: {
    icon: CheckCircle,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
    buttonClass: "bg-emerald-600 hover:bg-emerald-700",
  },
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  type = "warning",
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  requireTyping,
}: ConfirmDialogProps) {
  const [typing, setTyping] = useState("");
  const [loading, setLoading] = useState(false);

  const config = typeConfig[type];
  const Icon = config.icon;

  const canConfirm = requireTyping ? typing === requireTyping : true;

  const handleConfirm = async () => {
    if (!canConfirm) return;

    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setTyping("");
    }
  };

  const handleClose = () => {
    setTyping("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.iconBg}`}>
              <Icon className={`h-5 w-5 ${config.iconColor}`} />
            </div>
            <div>
              <DialogTitle className="text-base">{title}</DialogTitle>
              <DialogDescription className="mt-1 text-sm">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {requireTyping && (
          <div className="space-y-2 px-1">
            <Label className="text-sm">
              Ketik <span className="font-mono font-semibold">{requireTyping}</span> untuk konfirmasi
            </Label>
            <Input
              value={typing}
              onChange={(e) => setTyping(e.target.value)}
              placeholder={`Ketik ${requireTyping}`}
              className="h-9 text-sm"
              autoFocus
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading} className="h-9 text-sm">
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || loading}
            className={`h-9 text-sm ${config.buttonClass}`}
          >
            {loading ? "Memproses..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
