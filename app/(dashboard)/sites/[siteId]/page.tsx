"use client";

import Link from "next/link";
import { use, type ReactNode } from "react";

import { EntityManager, type ColumnDef, type FieldDef } from "@/components/entity-manager";
import { EmptyState, LoadingPage, PageHeader } from "@/components/ui";
import { usePaginatedQuery } from "@/lib/api/use-paginated-query";
import { useApiQuery } from "@/lib/api/use-query";
import type { PaginatedRowsResponse } from "@/lib/pagination";
import { CONTACT_DEFAULT_SORT, INSTRUCTION_DEFAULT_SORT, SITE_PRODUCT_DEFAULT_SORT } from "@/lib/sort-config";

const categoryOptions = [
  { value: "general", label: "General" }, { value: "arrival", label: "Arrival" },
  { value: "stock", label: "Stock" }, { value: "safety", label: "Safety" },
  { value: "access", label: "Access" }, { value: "other", label: "Other" },
];

export default function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const siteQuery = useApiQuery<{ site: { name: string; address: string }; products: { id: string; sku: string; name: string }[] }>(`/api/sites/${siteId}`);
  const contacts = usePaginatedQuery<PaginatedRowsResponse>("/api/contacts", { prefix: "contacts", defaultSort: CONTACT_DEFAULT_SORT, extraParams: { site_id: siteId } });
  const instructions = usePaginatedQuery<PaginatedRowsResponse>("/api/instructions", { prefix: "instructions", defaultSort: INSTRUCTION_DEFAULT_SORT, extraParams: { site_id: siteId } });
  const siteProducts = usePaginatedQuery<PaginatedRowsResponse>("/api/site-products", { prefix: "products", defaultSort: SITE_PRODUCT_DEFAULT_SORT, extraParams: { site_id: siteId } });

  if (siteQuery.initialLoading) return <LoadingPage label="Loading site..." />;
  if (siteQuery.error || !siteQuery.data) return <EmptyState message="Could not load this site. Please try again." />;

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
    { name: "instruction", label: "Instruction", type: "textarea", required: true }, { name: "title", label: "Title" },
    { name: "category", label: "Category", type: "select", options: categoryOptions },
    { name: "sort_order", label: "Display order", type: "number", step: "1" }, { name: "image_url", label: "Image link" },
    { name: "sensitive", label: "Sensitive", type: "checkbox" },
  ];
  const instructionColumns: ColumnDef[] = [
    { key: "sort_order", label: "#" }, { key: "category", label: "Category", variant: "badge" },
    { key: "title", label: "Title" }, { key: "instruction", label: "Instruction", variant: "truncate" },
    { key: "sensitive", label: "Sensitive", variant: "boolean" },
  ];
  const siteProductFields: FieldDef[] = [
    { name: "product_id", label: "Product", type: "select", options: productOptions, required: true, createOnly: true },
    { name: "minimum_quantity", label: "Minimum quantity", type: "number", step: "0.01", required: true },
    { name: "unit_of_measure", label: "Unit of measure", required: true },
    { name: "order_multiple", label: "Order multiple", type: "number", step: "0.01" }, { name: "notes", label: "Notes" },
  ];
  const siteProductColumns: ColumnDef[] = [
    { key: "product_sku", label: "Product code" },
    { key: "product_name", label: "Product name" },
    { key: "minimum_quantity", label: "Minimum" }, { key: "unit_of_measure", label: "Unit" },
    { key: "order_multiple", label: "Order in multiples of" }, { key: "notes", label: "Notes" },
  ];

  return (
    <div>
      <PageHeader title={siteQuery.data.site.name} description={siteQuery.data.site.address} actions={<Link href="/sites" className="rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-600 hover:bg-slate-100">Back to sites</Link>} />
      <SiteSection title="Contacts" loading={contacts.initialLoading} error={Boolean(contacts.error && !contacts.data)}>
        <EntityManager apiBase="/api/contacts" rows={contacts.data?.rows ?? []} columns={contactColumns} fields={contactFields} createLabel="Add contact" emptyMessage="No contacts yet." hiddenFields={{ site_id: siteId }} onMutate={contacts.reload} refreshing={contacts.refreshing} sort={{ column: contacts.sort, dir: contacts.sortDir, onChange: contacts.setSort }} search={{ value: contacts.search, onChange: contacts.setSearch, placeholder: "Search contacts..." }} />
      </SiteSection>
      <SiteSection title="Site instructions" loading={instructions.initialLoading} error={Boolean(instructions.error && !instructions.data)}>
        <EntityManager apiBase="/api/instructions" rows={instructions.data?.rows ?? []} columns={instructionColumns} fields={instructionFields} createLabel="Add instruction" emptyMessage="No instructions yet." hiddenFields={{ site_id: siteId }} onMutate={instructions.reload} refreshing={instructions.refreshing} sort={{ column: instructions.sort, dir: instructions.sortDir, onChange: instructions.setSort }} search={{ value: instructions.search, onChange: instructions.setSearch, placeholder: "Search instructions..." }} />
      </SiteSection>
      <SiteSection title="Products" loading={siteProducts.initialLoading} error={Boolean(siteProducts.error && !siteProducts.data)}>
        <EntityManager apiBase="/api/site-products" rows={siteProducts.data?.rows ?? []} columns={siteProductColumns} fields={siteProductFields} createLabel="Add product to site" emptyMessage="No products assigned to this site yet." hiddenFields={{ site_id: siteId }} onMutate={siteProducts.reload} refreshing={siteProducts.refreshing} sort={{ column: siteProducts.sort, dir: siteProducts.sortDir, onChange: siteProducts.setSort }} search={{ value: siteProducts.search, onChange: siteProducts.setSearch, placeholder: "Search products..." }} />
      </SiteSection>
    </div>
  );
}

function SiteSection({ title, loading, error, children }: { title: string; loading: boolean; error: boolean; children: ReactNode }) {
  return <section className="mb-10"><h2 className="mb-3 text-xl text-slate-900">{title}</h2>{loading ? <LoadingPage label={`Loading ${title.toLowerCase()}...`} /> : error ? <EmptyState message={`Could not load ${title.toLowerCase()}.`} /> : children}</section>;
}
