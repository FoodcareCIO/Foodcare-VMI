"use client";

import { useState } from "react";

import { Button, ConfirmModal } from "@/components/ui";
import { api } from "@/lib/api/client";

export const DeviceRevokeButton = ({
  deviceId,
  revoked,
  onMutate,
}: {
  deviceId: string;
  revoked: boolean;
  onMutate?: () => void | Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await api.patch("/api/devices", { id: deviceId, revoked: !revoked });
      setOpen(false);
      await onMutate?.();
    } catch {
      // API client shows a toast for backend errors.
    } finally {
      setBusy(false);
    }
  };

  const handleClick = () => {
    if (revoked) {
      void handleConfirm();
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        variant={revoked ? "primary" : "danger"}
        size="sm"
        loading={busy && revoked}
        icon={revoked ? "mdi:cellphone-check" : "mdi:cellphone-off"}
        onClick={() => void handleClick()}
      >
        {revoked ? "Restore" : "Revoke"}
      </Button>

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        loading={busy}
        tone="warning"
        icon="mdi:cellphone-off"
        title="Revoke device?"
        description="The rep will need to sign in again on their device."
        confirmLabel="Revoke device"
      />
    </>
  );
};
