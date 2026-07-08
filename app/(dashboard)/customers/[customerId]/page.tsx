"use client";

import Link from "next/link";
import { use, useMemo } from "react";

import {
  EntityManager,
  type ColumnDef,
  type FieldDef,
} from "@/components/entity-manager";
import { EmptyState, LoadingPage, PageHeader } from "@/components/ui";
import { usePaginatedQuery } from "@/lib/api/use-paginated-query";
import { useApiQuery } from "@/lib/api/use-query";
import type { PaginatedRowsResponse } from "@/lib/pagination";
import {
  CONTACT_DEFAULT_SORT,
  SITE_DEFAULT_SORT,
} from "@/lib/sort-config";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = use(params);
  const {
    data: customerData,
    error: customerError,
    initialLoading: customerInitialLoading,
  } = useApiQuery<{ customer: { name: string; account_code: string | null } }>(
    `/api/customers/${customerId}`,
  );

  const {
    data: sitesData,
    error: sitesError,
    initialLoading: sitesInitialLoading,
    refreshing: sitesRefreshing,
    reload: reloadSites,
    setPage: setSitesPage,
    setLimit: setSitesLimit,
    sort: sitesSort,
    sortDir: sitesSortDir,
    setSort: setSitesSort,
    search: sitesSearch,
    setSearch: setSitesSearch,
  } = usePaginatedQuery<PaginatedRowsResponse>("/api/sites", {
    prefix: "sites",
    defaultSort: SITE_DEFAULT_SORT,
    extraParams: { customer_id: customerId },
  });

  const {
    data: contactsData,
    error: contactsError,
    initialLoading: contactsInitialLoading,
    refreshing: contactsRefreshing,
    reload: reloadContacts,
    setPage: setContactsPage,
    setLimit: setContactsLimit,
    sort: contactsSort,
    sortDir: contactsSortDir,
    setSort: setContactsSort,
    search: contactsSearch,
    setSearch: setContactsSearch,
  } = usePaginatedQuery<PaginatedRowsResponse>("/api/contacts", {
    prefix: "contacts",
    defaultSort: CONTACT_DEFAULT_SORT,
    extraParams: { customer_id: customerId },
  });

  const siteOptions = useMemo(
    () =>
      (sitesData?.rows ?? []).map((s) => ({
        value: String(s.id),
        label: String(s.name),
      })),
    [sitesData?.rows],
  );

  const siteNameLookup = useMemo(
    () =>
      Object.fromEntries(
        (sitesData?.rows ?? []).map((s) => [String(s.id), String(s.name)]),
      ),
    [sitesData?.rows],
  );

  if (customerInitialLoading) {
    return <LoadingPage label="Loading customer..." />;
  }
  if (customerError || !customerData) {
    return <EmptyState message="Could not load this customer. Please try again." />;
  }

  const siteFields: FieldDef[] = [
    { name: "name", label: "Site name", required: true },
    { name: "address", label: "Address", required: true },
  ];

  const siteColumns: ColumnDef[] = [
    {
      key: "name",
      label: "Site",
      variant: "link",
      hrefTemplate: `/customers/${customerId}/sites/:id`,
    },
    { key: "address", label: "Address" },
  ];

  const contactFields: FieldDef[] = [
    { name: "name", label: "Contact name", required: true },
    { name: "phone", label: "Phone" },
    { name: "email", label: "Email", type: "email" },
    {
      name: "site_id",
      label: "Site (optional)",
      type: "select",
      options: siteOptions,
    },
    {
      name: "is_primary",
      label: "Primary contact",
      type: "checkbox",
      help: "Mark as the main point of contact.",
    },
  ];

  const contactColumns: ColumnDef[] = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    {
      key: "site_id",
      label: "Site",
      variant: "lookup",
      lookup: siteNameLookup,
      emptyText: "All sites",
    },
    { key: "is_primary", label: "Primary", variant: "boolean" },
  ];

  return (
    <div>
      <PageHeader
        title={customerData.customer.name}
        description={
          customerData.customer.account_code
            ? `Account code: ${customerData.customer.account_code}`
            : "Customer detail"
        }
        actions={
          <Link
            href="/customers"
            className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-600 hover:bg-slate-100"
          >
            Back to customers
          </Link>
        }
      />

      <section className="mb-10">
        <h2 className="mb-3 text-xl text-slate-900">Sites</h2>
        {sitesInitialLoading ? (
          <LoadingPage label="Loading sites..." />
        ) : sitesError && !sitesData ? (
          <EmptyState message="Could not load sites." />
        ) : (
        <EntityManager
          apiBase="/api/sites"
          rows={sitesData?.rows ?? []}
          columns={siteColumns}
          fields={siteFields}
          createLabel="Add site"
          emptyMessage="No sites yet."
          hiddenFields={{ customer_id: customerId }}
          linkActions={[
            { label: "Open", hrefTemplate: `/customers/${customerId}/sites/:id` },
          ]}
          onMutate={reloadSites}
          refreshing={sitesRefreshing}
          sort={{ column: sitesSort, dir: sitesSortDir, onChange: setSitesSort }}
          search={{
            value: sitesSearch,
            onChange: setSitesSearch,
            placeholder: "Search sites...",
          }}
          pagination={
            sitesData
              ? {
                  page: sitesData.page,
                  limit: sitesData.limit,
                  total: sitesData.total,
                  totalPages: sitesData.totalPages,
                  onPageChange: setSitesPage,
                  onLimitChange: setSitesLimit,
                }
              : undefined
          }
        />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl text-slate-900">Contacts</h2>
        {contactsInitialLoading ? (
          <LoadingPage label="Loading contacts..." />
        ) : contactsError && !contactsData ? (
          <EmptyState message="Could not load contacts." />
        ) : (
        <EntityManager
          apiBase="/api/contacts"
          rows={contactsData?.rows ?? []}
          columns={contactColumns}
          fields={contactFields}
          createLabel="Add contact"
          emptyMessage="No contacts yet."
          hiddenFields={{ customer_id: customerId }}
          onMutate={reloadContacts}
          refreshing={contactsRefreshing}
          sort={{ column: contactsSort, dir: contactsSortDir, onChange: setContactsSort }}
          search={{
            value: contactsSearch,
            onChange: setContactsSearch,
            placeholder: "Search contacts...",
          }}
          pagination={
            contactsData
              ? {
                  page: contactsData.page,
                  limit: contactsData.limit,
                  total: contactsData.total,
                  totalPages: contactsData.totalPages,
                  onPageChange: setContactsPage,
                  onLimitChange: setContactsLimit,
                }
              : undefined
          }
        />
        )}
      </section>
    </div>
  );
}
