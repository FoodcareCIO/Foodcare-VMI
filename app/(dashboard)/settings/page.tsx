"use client";

import { useState, type FormEvent } from "react";

import {
  Button,
  Card,
  EmptyState,
  Icon,
  Input,
  LoadingPage,
  PageHeader,
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
      <PageHeader title="Settings" description="Where submitted orders are emailed and who is told when emails fail." />
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
      notify.success("Order email settings saved.");
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
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Icon icon="mdi:alert-outline" width={22} height={22} className="mt-0.5 text-amber-600" />
          <div>
            <p className="text-base font-semibold text-amber-900">No main order email is set</p>
            <p className="mt-0.5 text-base text-amber-800/80">Submitted orders cannot be emailed until a main order email is saved.</p>
          </div>
        </div>
      ) : null}

      <Card className="p-6">
        <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
          <div>
            <h2 className="text-xl text-slate-900">Order email</h2>
            <p className="mt-1 text-slate-500">
              Separate several addresses with commas or new lines. Extra addresses for one site are set on that site&apos;s page.
            </p>
          </div>
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
            help="Every order is sent here. Required for order emails to be sent."
          />
          <Textarea
            label="Copy (CC) addresses"
            rows={3}
            value={lists.cc_recipients}
            onChange={(event) => setList("cc_recipients", event.target.value)}
            placeholder="manager@company.com.au"
            error={errors.cc_recipients}
            help="Receive a copy of every order."
          />
          <Textarea
            label="Office alert addresses"
            rows={3}
            value={lists.alert_recipients}
            onChange={(event) => setList("alert_recipients", event.target.value)}
            placeholder="office@company.com.au"
            error={errors.alert_recipients}
            help="Order administrators who are alerted when an order email keeps failing."
          />
          <Textarea
            label="Technical support addresses"
            rows={3}
            value={lists.support_recipients}
            onChange={(event) => setList("support_recipients", event.target.value)}
            placeholder="support@company.com.au"
            error={errors.support_recipients}
            help="Alerted when order emails keep failing for a longer time (a system problem)."
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-500">
              {settings.updated_at
                ? `Last saved ${formatDateTime(settings.updated_at)}${settings.updated_by_name ? ` by ${settings.updated_by_name}` : ""}`
                : null}
            </p>
            <Button type="submit" variant="primary" icon="mdi:content-save-outline" loading={busy}>
              Save settings
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
