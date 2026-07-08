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
      setFieldError("Rejection reason is required.");
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
        variant="outline"
        size="sm"
        icon="mdi:close-circle-outline"
        className="border-red-300 text-red-600 hover:bg-red-50"
        onClick={() => setOpen(true)}
      >
        Reject order
      </Button>

      <Modal open={open} title="Reject order" onClose={() => setOpen(false)} size="sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <Textarea
            label="Rejection reason"
            rows={4}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              if (fieldError) setFieldError(undefined);
            }}
            placeholder="Explain why this order is being rejected..."
            error={fieldError}
          />
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="danger"
              loading={busy}
              icon="mdi:alert-circle-outline"
            >
              Confirm rejection
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
