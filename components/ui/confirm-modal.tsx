"use client";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";

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
    iconWrap: "bg-danger-soft text-danger-text",
    confirmVariant: "danger",
  },
  primary: {
    icon: "mdi:backup-restore",
    iconWrap: "bg-primary-soft text-primary-text",
    confirmVariant: "primary",
  },
  warning: {
    icon: "mdi:alert-circle-outline",
    iconWrap: "bg-warning-soft text-warning-text",
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
          <Icon icon={icon ?? styles.icon} size="lg" />
        </div>
        <p className="pt-2 text-base text-fg-muted">{description}</p>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={loading}>
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
