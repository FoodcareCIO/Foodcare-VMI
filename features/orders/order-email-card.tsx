"use client";

import { useState, type ReactNode } from "react";

import { Badge, Button, Card, ConfirmModal, formatDate } from "@/components/ui";
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
    ["To", recipients.length > 0 ? recipients.join(", ") : <span className="text-slate-400">Set when the email is sent</span>],
    ["Copy (CC)", cc.length > 0 ? cc.join(", ") : "-"],
    ["Sent", formatDate(exportRow?.emailed_at)],
    ["Attempts", exportRow?.email_attempts ?? 0],
  ];
  if (retrying && exportRow?.next_email_attempt_at) {
    rows.push(["Next retry", formatDate(exportRow.next_email_attempt_at)]);
  }
  if (exportRow?.resend_requested_at) rows.push(["Resend requested", formatDate(exportRow.resend_requested_at)]);
  if (exportRow?.office_alerted_at) rows.push(["Office alerted", formatDate(exportRow.office_alerted_at)]);
  if (exportRow?.last_error && state !== "sent") {
    rows.push(["Last error", <span key="error" className="text-red-700">{exportRow.last_error}</span>]);
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl text-slate-900">Email</h2>
        {orderStatus === "completed" ? (
          <Button variant="outline" size="sm" icon="mdi:email-sync-outline" onClick={() => setConfirming(true)}>
            Resend email
          </Button>
        ) : null}
      </div>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2.5 text-base">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd className="break-words text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      <ConfirmModal
        open={confirming}
        tone="primary"
        icon="mdi:email-sync-outline"
        title="Resend order email"
        confirmLabel="Resend email"
        loading={busy}
        onClose={() => {
          if (!busy) setConfirming(false);
        }}
        onConfirm={resend}
        description={
          state === "sent"
            ? "This order was already emailed. Send it again to the current order addresses? The email will be sent within a minute."
            : "Send this order email again to the current order addresses? The email will be sent within a minute."
        }
      />
    </Card>
  );
}
