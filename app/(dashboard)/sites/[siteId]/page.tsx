"use client";

import { use, type ReactNode } from "react";

import { EntityManager, type ColumnDef, type FieldDef } from "@/components/entity-manager";
import { EmptyState, LoadingPage, PageHeader, SectionHeader } from "@/components/ui";
import { SiteOrderEmail, type OrderEmailDefaults } from "@/features/sites/site-order-email";
import { SiteProductListActions, SiteProductListStatus } from "@/features/sites/site-product-list";
import { usePaginatedQuery } from "@/lib/api/use-paginated-query";
import { useApiQuery } from "@/lib/api/use-query";
import type { PaginatedRowsResponse } from "@/lib/pagination";
import type { SiteProductListInfo } from "@/lib/product-import-types";
import { CONTACT_DEFAULT_SORT, INSTRUCTION_DEFAULT_SORT, SITE_PRODUCT_DEFAULT_SORT } from "@/lib/sort-config";

const categoryOptions = [
  { value: "general", label: "General" }, { value: "arrival", label: "Arrival" },
  { value: "stock", label: "Stock" }, { value: "safety", label: "Safety" },
  { value: "access", label: "Access" }, { value: "other", label: "Other" },
];

interface SiteResponse {
  site: { name: string; address: string; order_recipients: string[] | null };
  products: { id: string; sku: string; name: string }[];
  orderEmail: OrderEmailDefaults;
}

export default function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const siteQuery = useApiQuery<SiteResponse>(`/api/sites/${siteId}`);
  const productList = useApiQuery<SiteProductListInfo>(`/api/sites/${siteId}/product-list`);
  const contacts = usePaginatedQuery<PaginatedRowsResponse>("/api/contacts", { prefix: "contacts", defaultSort: CONTACT_DEFAULT_SORT, extraParams: { site_id: siteId } });
  const instructions = usePaginatedQuery<PaginatedRowsResponse>("/api/instructions", { prefix: "instructions", defaultSort: INSTRUCTION_DEFAULT_SORT, extraParams: { site_id: siteId } });
  const siteProducts = usePaginatedQuery<PaginatedRowsResponse>("/api/site-products", { prefix: "products", defaultSort: SITE_PRODUCT_DEFAULT_SORT, extraParams: { site_id: siteId } });

  if (siteQuery.initialLoading) return <LoadingPage label="Loading site..." />;
  if (siteQuery.error || !siteQuery.data) return <EmptyState message="Could not load this site. Please try again." />;

  const orderRecipients = siteQuery.data.site.order_recipients ?? [];
  const reloadProductList = async () => {
    await Promise.all([siteProducts.reload(), productList.reload(), siteQuery.reload()]);
  };

  const productOptions = siteQuery.data.products.map((product) => ({ value: product.id, label: `${product.sku} - ${product.name}` }));
  const contactFields: FieldDef[] = [
    { name: "name", label: "Contact name", required: true }, { name: "phone", label: "Phone" },
    { name: "email", label: "Email", type: "email" }, { name: "is_primary", label: "Primary contact", type: "checkbox" },
  ];
  const contactColumns: ColumnDef[] = [
    { key: "name", label: "Name" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" },
    { key: "scope", label: "Scope" },
    { key: "is_primary", label: "Primary", variant: "boolean" },
  ];
  const instructionFields: FieldDef[] = [
    { name: "instruction", label: "Note", type: "textarea", required: true }, { name: "title", label: "Title" },
    { name: "category", label: "Type of note", type: "select", options: categoryOptions },
    { name: "sort_order", label: "Order in the list", type: "number", step: "1" }, { name: "image_url", label: "Photo link" },
    { name: "sensitive", label: "Private", type: "checkbox", help: "Only for internal use." },
  ];
  const instructionColumns: ColumnDef[] = [
    { key: "sort_order", label: "#" }, { key: "category", label: "Type", variant: "badge" },
    { key: "title", label: "Title" }, { key: "instruction", label: "Note", variant: "truncate" },
    { key: "sensitive", label: "Private", variant: "boolean" },
  ];
  const siteProductFields: FieldDef[] = [
    { name: "product_id", label: "Product", type: "select", options: productOptions, required: true, createOnly: true },
    { name: "minimum_quantity", label: "Minimum stock", type: "number", step: "0.01", required: true },
    { name: "unit_of_measure", label: "Unit", required: true },
    { name: "order_multiple", label: "Order in multiples of", type: "number", step: "0.01" }, { name: "notes", label: "Notes" },
  ];
  const siteProductColumns: ColumnDef[] = [
    { key: "product_sku", label: "Product code" },
    { key: "product_name", label: "Product name" },
    { key: "minimum_quantity", label: "Minimum" }, { key: "unit_of_measure", label: "Unit" },
    { key: "order_multiple", label: "Order in multiples of" }, { key: "notes", label: "Notes" },
  ];

  return (
    <div>
      <PageHeader back={{ href: "/sites", label: "Back to sites" }} title={siteQuery.data.site.name} description={siteQuery.data.site.address} />
      <SiteSection title="Contacts" icon="mdi:account-box-outline" loading={contacts.initialLoading} error={Boolean(contacts.error && !contacts.data)}>
        <EntityManager apiBase="/api/contacts" rows={contacts.data?.rows ?? []} columns={contactColumns} fields={contactFields} createLabel="Add contact" emptyMessage="No contacts yet." hiddenFields={{ site_id: siteId }} onMutate={contacts.reload} refreshing={contacts.refreshing} sort={{ column: contacts.sort, dir: contacts.sortDir, onChange: contacts.setSort }} search={{ value: contacts.search, onChange: contacts.setSearch, placeholder: "Search contacts..." }} />
      </SiteSection>
      <SiteSection title="Order email" icon="mdi:email-outline" loading={false} error={false}>
        <SiteOrderEmail key={orderRecipients.join(",")} siteId={siteId} recipients={orderRecipients} orderEmail={siteQuery.data.orderEmail} onSaved={siteQuery.reload} />
      </SiteSection>
      <SiteSection title="Site notes" icon="mdi:note-text-outline" subtitle="Parking, entry and safety notes that reps see on the tablet." loading={instructions.initialLoading} error={Boolean(instructions.error && !instructions.data)}>
        <EntityManager apiBase="/api/instructions" rows={instructions.data?.rows ?? []} columns={instructionColumns} fields={instructionFields} createLabel="Add note" emptyMessage="No notes yet." hiddenFields={{ site_id: siteId }} onMutate={instructions.reload} refreshing={instructions.refreshing} sort={{ column: instructions.sort, dir: instructions.sortDir, onChange: instructions.setSort }} search={{ value: instructions.search, onChange: instructions.setSearch, placeholder: "Search notes" }} />
      </SiteSection>
      <SiteSection
        title="Products"
        icon="mdi:package-variant"
        subtitle={<SiteProductListStatus info={productList.data} />}
        actions={<SiteProductListActions siteId={siteId} siteName={siteQuery.data.site.name} onChanged={reloadProductList} />}
        loading={siteProducts.initialLoading}
        error={Boolean(siteProducts.error && !siteProducts.data)}
      >
        <EntityManager apiBase="/api/site-products" rows={siteProducts.data?.rows ?? []} columns={siteProductColumns} fields={siteProductFields} createLabel="Add product to site" emptyMessage="No products assigned to this site yet." hiddenFields={{ site_id: siteId }} onMutate={siteProducts.reload} refreshing={siteProducts.refreshing} sort={{ column: siteProducts.sort, dir: siteProducts.sortDir, onChange: siteProducts.setSort }} search={{ value: siteProducts.search, onChange: siteProducts.setSearch, placeholder: "Search products..." }} />
      </SiteSection>
    </div>
  );
}

function SiteSection({ title, subtitle, icon, actions, loading, error, children }: { title: string; subtitle?: ReactNode; icon?: string; actions?: ReactNode; loading: boolean; error: boolean; children: ReactNode }) {
  return (
    <section className="mb-10">
      <SectionHeader title={title} icon={icon} description={subtitle} actions={actions} />
      {loading ? <LoadingPage compact label={`Loading ${title.toLowerCase()}...`} /> : error ? <EmptyState message={`Could not load ${title.toLowerCase()}.`} /> : children}
    </section>
  );
}
