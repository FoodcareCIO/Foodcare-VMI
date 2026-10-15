// Order email and photo status shown on the Orders pages.

export type OrderEmailState =
  | "sent"
  | "waiting_photos"
  | "pending"
  | "sending"
  | "failed"
  | "not_sent";

export const ORDER_EMAIL_LABELS: Record<OrderEmailState, string> = {
  sent: "Sent",
  waiting_photos: "Waiting for photos",
  pending: "Pending",
  sending: "Sending",
  failed: "Failed – retrying",
  not_sent: "Not sent",
};

export interface PhotoCounts {
  /** Photos the tablet attached on submit; null for older app versions. */
  expected: number | null;
  received: number;
}

export function countPhotos(
  expectedIds: string[] | null | undefined,
  attachments: { id: string; deleted_at?: string | null }[] | null | undefined,
): PhotoCounts {
  const active = (attachments ?? []).filter((attachment) => !attachment.deleted_at);
  if (!Array.isArray(expectedIds)) return { expected: null, received: active.length };
  const expected = new Set(expectedIds.map((id) => id.toLowerCase()));
  return {
    expected: expected.size,
    received: active.filter((attachment) => expected.has(String(attachment.id).toLowerCase())).length,
  };
}

export function orderEmailState(
  order: { status: string; received_at?: string | null },
  emailStatus: string | null | undefined,
  photos: PhotoCounts,
): OrderEmailState {
  const waitingForPhotos = photos.expected !== null && photos.received < photos.expected;
  if (emailStatus === "sent") return "sent";
  if (emailStatus === "sending") return "sending";
  if (emailStatus === "failed") return "failed";
  if (emailStatus === "pending") return waitingForPhotos ? "waiting_photos" : "pending";
  // No email requested yet: orders received by the new server flow are queued.
  if (order.status === "completed" && order.received_at) {
    return waitingForPhotos ? "waiting_photos" : "pending";
  }
  return "not_sent";
}
