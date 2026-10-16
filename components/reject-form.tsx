"use client";

import { useState } from "react";

import { Button, Modal, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";

export const RejectForm = ({
  orderId,
  onSuccess,
}: {
  orderId: string;
  onSuccess?: () => void | Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!reason.trim()) {
      setFieldError("Please say why you are rejecting this order.");
      return;
    }

    setBusy(true);
    setFieldError(undefined);
    try {
      await api.post(`/api/orders/${orderId}/reject`, { reason });
      setOpen(false);
      setReason("");
      await onSuccess?.();
    } catch {
      // API client shows a toast for backend errors.
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="danger"
        icon="mdi:close-circle-outline"
        onClick={() => setOpen(true)}
      >
        Reject order
      </Button>

      <Modal open={open} title="Reject this order" onClose={() => setOpen(false)} size="sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Textarea
            label="Reason"
            rows={4}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (fieldError) setFieldError(undefined);
            }}
            placeholder="Tell the rep why this order is being rejected"
            error={fieldError}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={busy}>
              Reject order
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
