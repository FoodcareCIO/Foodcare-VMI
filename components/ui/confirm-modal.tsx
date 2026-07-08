"use client";

import { Button, Modal } from "@/components/ui";
import { Icon } from "@/components/ui/icon";

export type ConfirmModalTone = "danger" | "primary" | "warning";

export interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmModalTone;
  loading?: boolean;
  icon?: string;
}

const toneStyles: Record<
  ConfirmModalTone,
  { icon: string; iconWrap: string; confirmVariant: "danger" | "primary" }
> = {
  danger: {
    icon: "mdi:delete-outline",
    iconWrap: "bg-red-50 text-red-600",
    confirmVariant: "danger",
  },
  primary: {
    icon: "mdi:backup-restore",
    iconWrap: "bg-emerald-50 text-emerald-600",
    confirmVariant: "primary",
  },
  warning: {
    icon: "mdi:alert-circle-outline",
    iconWrap: "bg-amber-50 text-amber-600",
    confirmVariant: "danger",
  },
};

export const ConfirmModal = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  icon,
}: ConfirmModalProps) => {
  const styles = toneStyles[tone];

  return (
    <Modal open={open} title={title} onClose={onClose} size="sm">
      <div className="flex gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${styles.iconWrap}`}
        >
          <Icon icon={icon ?? styles.icon} width={22} height={22} />
        </div>
        <p className="pt-2 text-base leading-6 text-slate-600">{description}</p>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          variant={styles.confirmVariant}
          loading={loading}
          icon={icon ?? styles.icon}
          onClick={() => void onConfirm()}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
};

/** @deprecated Use `ConfirmModal` instead. */
export const DeleteModal = ConfirmModal;
