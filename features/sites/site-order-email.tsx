"use client";

import Link from "next/link";
import { useState } from "react";

import { Button, Icon, Textarea } from "@/components/ui";
import { api } from "@/lib/api/client";
import { notify } from "@/lib/notifications";
import { emailListError, parseEmailList } from "@/lib/validation";

export interface OrderEmailDefaults {
  main_recipient: string | null;
  cc_recipients: string[];
}

export function SiteOrderEmail({
  siteId,
  recipients,
  orderEmail,
  onSaved,
}: {
  siteId: string;
  recipients: string[];
  orderEmail: OrderEmailDefaults;
  onSaved: () => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(recipients.join("\n"));
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const parsed = parseEmailList(draft);
  const dirty = parsed.invalid.length > 0 || parsed.emails.join(",") !== recipients.join(",");

  const save = async () => {
    const nextError = emailListError(draft);
    setError(nextError);
    if (nextError) return;
    setBusy(true);
    try {
      await api.patch(`/api/sites/${siteId}`, { order_recipients: parsed.emails });
      notify.success("Order addresses for this site saved.");
      await onSaved();
    } catch {
      // The shared API client displays the backend error.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {orderEmail.main_recipient ? (
        <p className="text-slate-700">
          Orders for this site go to: <strong className="font-semibold">{orderEmail.main_recipient}</strong>
          {recipients.length > 0 ? (
            <>
              {" "}+ <strong className="font-semibold">{recipients.join(", ")}</strong>
            </>
          ) : null}
          {orderEmail.cc_recipients.length > 0 ? <> · Copy: {orderEmail.cc_recipients.join(", ")}</> : null}
        </p>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
          <Icon icon="mdi:alert-outline" width={20} height={20} className="mt-0.5 shrink-0 text-amber-600" />
          <p>
            No main order address is set, so orders cannot be emailed.{" "}
            <Link href="/settings" className="font-medium underline-offset-2 hover:underline">
              Set it in Settings
            </Link>
            .
          </p>
        </div>
      )}

      <Textarea
        wrapperClassName="mt-4"
        label="Extra addresses for this site"
        rows={3}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          if (error) setError(undefined);
        }}
        placeholder="manager@customer.com.au"
        error={error}
        help="These addresses receive this site's orders in addition to the main order address. Separate addresses with commas or new lines."
      />
      <div className="mt-3 flex justify-end">
        <Button variant="secondary" loading={busy} disabled={!dirty} onClick={save}>
          Save addresses
        </Button>
      </div>
    </div>
  );
}
