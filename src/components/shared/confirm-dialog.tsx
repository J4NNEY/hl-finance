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
    iconColor: "text-red-600",
    iconBg: "bg-red-50",
    buttonClass: "bg-red-600 hover:bg-red-700",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-50",
    buttonClass: "bg-orange-600 hover:bg-orange-700",
  },
  info: {
    icon: Info,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    buttonClass: "bg-blue-600 hover:bg-blue-700",
  },
  success: {
    icon: CheckCircle,
    iconColor: "text-green-600",
    iconBg: "bg-green-50",
    buttonClass: "bg-green-600 hover:bg-green-700",
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
