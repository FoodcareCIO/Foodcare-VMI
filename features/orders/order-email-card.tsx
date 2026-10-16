"use client";

import { useState, type ReactNode } from "react";

import {
  Badge,
  Button,
  Card,
  ConfirmModal,
  DescriptionList,
  SectionHeader,
  formatDate,
} from "@/components/ui";
import { api } from "@/lib/api/client";
import { notify } from "@/lib/notifications";
import { ORDER_EMAIL_LABELS, type OrderEmailState } from "@/lib/order-email";
import type { StockCountExport } from "@/lib/types";

export function OrderEmailCard({
  orderId,
  orderStatus,
  state,
  exportRow,
  onResent,
}: {
  orderId: string;
  orderStatus: string;
  state: OrderEmailState;
  exportRow: Partial<StockCountExport> | null;
  onResent: () => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const recipients = exportRow?.recipients ?? [];
  const cc = exportRow?.cc_recipients ?? [];
  const retrying = state === "failed" || state === "pending" || state === "waiting_photos";

  const resend = async () => {
    setBusy(true);
    try {
      const result = await api.post<{ message: string }>(`/api/orders/${orderId}/resend-email`, {});
      notify.success(result.message);
      setConfirming(false);
      await onResent();
    } catch {
      // The shared API client displays the backend error.
    } finally {
      setBusy(false);
    }
  };

  const rows: [string, ReactNode][] = [
    ["Status", <Badge key="status" value={state} label={ORDER_EMAIL_LABELS[state]} />],
    ["To", recipients.length > 0 ? recipients.join(", ") : <span className="text-fg-muted">Set when the email is sent</span>],
    ["Copy (CC)", cc.length > 0 ? cc.join(", ") : "-"],
    ["Sent", formatDate(exportRow?.emailed_at)],
    ["Attempts", exportRow?.email_attempts ?? 0],
  ];
  if (retrying && exportRow?.next_email_attempt_at) {
    rows.push(["Next try", formatDate(exportRow.next_email_attempt_at)]);
  }
  if (exportRow?.resend_requested_at) rows.push(["Resend requested", formatDate(exportRow.resend_requested_at)]);
  if (exportRow?.office_alerted_at) rows.push(["Office told", formatDate(exportRow.office_alerted_at)]);
  if (exportRow?.last_error && state !== "sent") {
    rows.push(["Problem", <span key="error" className="text-danger-text">{exportRow.last_error}</span>]);
  }

  return (
    <Card padding="md">
      <SectionHeader
        title="Email"
        icon="mdi:email-outline"
        actions={
          orderStatus === "completed" ? (
            <Button variant="secondary" size="sm" icon="mdi:email-sync-outline" onClick={() => setConfirming(true)}>
              Send again
            </Button>
          ) : null
        }
      />
      <DescriptionList rows={rows} />
      <ConfirmModal
        open={confirming}
        tone="primary"
        icon="mdi:email-sync-outline"
        title="Send this order again?"
        confirmLabel="Send again"
        loading={busy}
        onClose={() => {
          if (!busy) setConfirming(false);
        }}
        onConfirm={resend}
        description={
          state === "sent"
            ? "This order was already emailed. Send it again to the current order addresses? It will go out within a minute."
            : "Send this order to the current order addresses? It will go out within a minute."
        }
      />
    </Card>
  );
}
