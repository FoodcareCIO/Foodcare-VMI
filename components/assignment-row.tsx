"use client";

import { useState } from "react";

import { Button } from "@/components/ui";
import { api } from "@/lib/api/client";

export const AssignmentRow = ({
  repId,
  siteId,
  siteName,
  assigned,
  onMutate,
}: {
  repId: string;
  siteId: string;
  siteName: string;
  assigned: boolean;
  onMutate?: () => void | Promise<void>;
}) => {
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      await api.put(`/api/reps/${repId}/assignments`, {
        site_id: siteId,
        assigned: !assigned,
      });
      await onMutate?.();
    } catch {
      // API client shows a toast for backend errors.
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="flex items-center justify-between border-b border-slate-100 px-4 py-3 last:border-0">
      <span className="text-base text-slate-700">{siteName}</span>
      <Button
        variant={assigned ? "outline" : "primary"}
        size="sm"
        loading={busy}
        icon={assigned ? "mdi:link-off" : "mdi:link-variant"}
        onClick={() => void toggle()}
      >
        {assigned ? "Unassign" : "Assign"}
      </Button>
    </li>
  );
};
