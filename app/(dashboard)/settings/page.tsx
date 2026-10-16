"use client";

import { useState, type FormEvent } from "react";

import {
  Alert,
  Button,
  Card,
  EmptyState,
  Input,
  LoadingPage,
  PageHeader,
  SectionHeader,
  Textarea,
  formatDateTime,
} from "@/components/ui";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/use-query";
import { notify } from "@/lib/notifications";
import type { OrderEmailSettings } from "@/lib/types";
import { emailListError, isValidEmail, parseEmailList } from "@/lib/validation";

type ListField = "cc_recipients" | "alert_recipients" | "support_recipients";
type FormErrors = Partial<Record<"main_recipient" | ListField, string>>;

export default function SettingsPage() {
  const { data, error, loading, reload } = useApiQuery<OrderEmailSettings>("/api/settings/order-email");

  if (loading && !data) return <LoadingPage label="Loading settings..." />;
  if (error || !data) return <EmptyState message="Could not load settings. Please try again." />;

  return (
    <div>
      <PageHeader title="Settings" description="Choose who receives order emails, and who is told if one fails." />
      <OrderEmailForm key={data.updated_at ?? "new"} settings={data} onSaved={reload} />
    </div>
  );
}

function OrderEmailForm({ settings, onSaved }: { settings: OrderEmailSettings; onSaved: () => void | Promise<void> }) {
  const [main, setMain] = useState(settings.main_recipient ?? "");
  const [lists, setLists] = useState<Record<ListField, string>>({
    cc_recipients: settings.cc_recipients.join("\n"),
    alert_recipients: settings.alert_recipients.join("\n"),
    support_recipients: settings.support_recipients.join("\n"),
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [busy, setBusy] = useState(false);

  const setList = (field: ListField, value: string) => {
    setLists((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors: FormErrors = {
      main_recipient: main.trim() && !isValidEmail(main) ? "Enter one valid email address." : undefined,
      cc_recipients: emailListError(lists.cc_recipients),
      alert_recipients: emailListError(lists.alert_recipients),
      support_recipients: emailListError(lists.support_recipients),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    setBusy(true);
    try {
      await api.put("/api/settings/order-email", {
        main_recipient: main.trim() || null,
        cc_recipients: parseEmailList(lists.cc_recipients).emails,
        alert_recipients: parseEmailList(lists.alert_recipients).emails,
        support_recipients: parseEmailList(lists.support_recipients).emails,
      });
      notify.success("Settings saved.");
      await onSaved();
    } catch {
      // The shared API client displays the backend error.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      {!settings.main_recipient ? (
        <Alert tone="warning" title="No main order email yet">
          Orders can&apos;t be emailed until you add one below.
        </Alert>
      ) : null}

      <Card padding="lg">
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <SectionHeader
            title="Order emails"
            icon="mdi:email-outline"
            description="To add several addresses, put each on a new line or separate them with commas. Extra addresses for one site are set on that site's page."
          />
          <Input
            label="Main order email"
            type="email"
            prefixIcon="mdi:email-outline"
            value={main}
            onChange={(event) => {
              setMain(event.target.value);
              setErrors((current) => ({ ...current, main_recipient: undefined }));
            }}
            placeholder="orders@company.com.au"
            error={errors.main_recipient}
            help="Every order is sent here."
          />
          <Textarea
            label="Copy to (CC)"
            rows={3}
            value={lists.cc_recipients}
            onChange={(event) => setList("cc_recipients", event.target.value)}
            placeholder="manager@company.com.au"
            error={errors.cc_recipients}
            help="These people also get a copy of every order."
          />
          <Textarea
            label="Office alerts"
            rows={3}
            value={lists.alert_recipients}
            onChange={(event) => setList("alert_recipients", event.target.value)}
            placeholder="office@company.com.au"
            error={errors.alert_recipients}
            help="Told when an order email keeps failing."
          />
          <Textarea
            label="Technical support"
            rows={3}
            value={lists.support_recipients}
            onChange={(event) => setList("support_recipients", event.target.value)}
            placeholder="support@company.com.au"
            error={errors.support_recipients}
            help="Told when emails keep failing for longer, which usually means a system problem."
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <p className="text-sm text-fg-muted">
              {settings.updated_at
                ? `Last saved ${formatDateTime(settings.updated_at)}${settings.updated_by_name ? ` by ${settings.updated_by_name}` : ""}`
                : null}
            </p>
            <Button type="submit" icon="mdi:content-save-outline" loading={busy}>
              Save settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
