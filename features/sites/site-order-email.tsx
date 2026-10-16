"use client";

import { useState } from "react";

import { Alert, Button, Card, LinkButton, Textarea } from "@/components/ui";
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
      notify.success("Order emails for this site saved.");
      await onSaved();
    } catch {
      // The shared API client displays the backend error.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card padding="md">
      {orderEmail.main_recipient ? (
        <p className="text-base text-fg">
          Orders for this site go to <strong>{orderEmail.main_recipient}</strong>
          {recipients.length > 0 ? (
            <>
              {" "}and <strong>{recipients.join(", ")}</strong>
            </>
          ) : null}
          {orderEmail.cc_recipients.length > 0 ? (
            <span className="text-fg-muted"> · Copy to {orderEmail.cc_recipients.join(", ")}</span>
          ) : null}
          .
        </p>
      ) : (
        <Alert
          tone="warning"
          title="No main order email yet"
          action={
            <LinkButton href="/settings" variant="secondary" size="sm">
              Go to Settings
            </LinkButton>
          }
        >
          Orders can&apos;t be emailed until you add one.
        </Alert>
      )}

      <Textarea
        wrapperClassName="mt-4"
        label="Extra email addresses for this site"
        rows={3}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          if (error) setError(undefined);
        }}
        placeholder="manager@customer.com.au"
        error={error}
        help="These people also get this site's orders. Put each address on a new line, or separate them with commas."
      />
      <div className="mt-3 flex justify-end">
        <Button loading={busy} disabled={!dirty} onClick={save}>
          Save
        </Button>
      </div>
    </Card>
  );
}
