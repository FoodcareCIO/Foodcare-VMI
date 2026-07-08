import type { SupabaseClient } from "@supabase/supabase-js";

import { nowIso } from "@/lib/api/server";
import type { AdminSession } from "@/lib/auth";
import {
  paginatedMeta,
  paginationRange,
  type PaginationInput,
  type SortInput,
} from "@/lib/pagination";
import { buildSearchFilter } from "@/lib/search";
import {
  adminSearch,
  assignmentSearch,
  contactSearch,
  customerSearch,
  deviceSearch,
  instructionSearch,
  orderSearch,
  productSearch,
  repSearch,
  siteProductSearch,
  siteSearch,
} from "@/lib/search-config";

const EXPORT_BUCKET = "vmi-exports";

type OrderableQuery = {
  order: (
    column: string,
    options?: { ascending?: boolean; foreignTable?: string },
  ) => OrderableQuery;
};

function applyOrder<T extends OrderableQuery>(query: T, sort: SortInput): T {
  const options: { ascending: boolean; foreignTable?: string } = {
    ascending: sort.ascending,
  };
  if (sort.foreignTable) options.foreignTable = sort.foreignTable;
  return query.order(sort.column, options) as T;
}

function joinOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function countRows(
  db: SupabaseClient,
  table: string,
): Promise<number> {
  const { count } = await db
    .from(table)
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);
  return count ?? 0;
}

export async function getOverview(db: SupabaseClient) {
  const [customers, sites, products, reps] = await Promise.all([
    countRows(db, "customers"),
    countRows(db, "customer_sites"),
    countRows(db, "products"),
    countRows(db, "sales_reps"),
  ]);

  const { count: submittedOrders } = await db
    .from("stock_counts")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")
    .is("deleted_at", null);

  const { count: totalOrders } = await db
    .from("stock_counts")
    .select("*", { count: "exact", head: true })
    .is("deleted_at", null);

  const { data: statusRows } = await db
    .from("stock_counts")
    .select("status")
    .is("deleted_at", null);

  const statusBreakdown = { draft: 0, completed: 0, rejected: 0 };
  for (const row of statusRows ?? []) {
    const status = row.status as keyof typeof statusBreakdown;
    if (status in statusBreakdown) statusBreakdown[status] += 1;
  }

  const { data: exportRows } = await db
    .from("stock_count_exports")
    .select("email_status, generated_status");
  const failedExports = (exportRows ?? []).filter(
    (r) => r.email_status === "failed" || r.generated_status === "failed",
  ).length;

  const { data: recent } = await db
    .from("stock_counts")
    .select(
      "id,status,started_at,completed_at,customers(name),customer_sites(name)",
    )
    .is("deleted_at", null)
    .order("started_at", { ascending: false })
    .limit(8);

  return {
    metrics: {
      customers,
      sites,
      products,
      reps,
      submittedOrders: submittedOrders ?? 0,
      totalOrders: totalOrders ?? 0,
      failedExports,
    },
    statusBreakdown,
    recent: recent ?? [],
  };
}

export async function listCustomers(
  db: SupabaseClient,
  pagination: PaginationInput,
  sort: SortInput,
  search?: string,
) {
  const { from, to } = paginationRange(pagination);
  const searchFilter = await buildSearchFilter(db, search, customerSearch);
  let query = db
    .from("customers")
    .select("*", { count: "exact" })
    .is("deleted_at", null);
  if (searchFilter) query = query.or(searchFilter);
  const { data, error, count } = await applyOrder(query, sort).range(from, to);
  if (error) throw new Error(error.message);
  return {
    rows: data ?? [],
    ...paginatedMeta(pagination.page, pagination.limit, count ?? 0),
  };
}

export async function createCustomer(
  db: SupabaseClient,
  body: { name?: string; account_code?: string | null },
) {
  if (!body.name?.trim()) throw new Error("Name is required.");
  const { error } = await db.from("customers").insert({
    name: body.name.trim(),
    account_code: body.account_code ?? null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function updateCustomer(
  db: SupabaseClient,
  id: string,
  body: { name?: string; account_code?: string | null },
) {
  if (!body.name?.trim()) throw new Error("Name is required.");
  const { error } = await db
    .from("customers")
    .update({ name: body.name.trim(), account_code: body.account_code ?? null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteCustomer(
  db: SupabaseClient,
  id: string,
  restore: boolean,
) {
  const { error } = await db
    .from("customers")
    .update({ deleted_at: restore ? null : nowIso() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function getCustomer(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Customer not found.");
  return data;
}

export async function listSites(
  db: SupabaseClient,
  customerId: string,
  pagination: PaginationInput,
  sort: SortInput,
  search?: string,
) {
  const { from, to } = paginationRange(pagination);
  const searchFilter = await buildSearchFilter(db, search, siteSearch);
  let query = db
    .from("customer_sites")
    .select("*", { count: "exact" })
    .eq("customer_id", customerId)
    .is("deleted_at", null);
  if (searchFilter) query = query.or(searchFilter);
  const { data, error, count } = await applyOrder(query, sort).range(from, to);
  if (error) throw new Error(error.message);
  return {
    rows: data ?? [],
    ...paginatedMeta(pagination.page, pagination.limit, count ?? 0),
  };
}

export async function createSite(
  db: SupabaseClient,
  body: { customer_id?: string; name?: string; address?: string },
) {
  if (!body.customer_id) throw new Error("Missing customer.");
  if (!body.name?.trim()) throw new Error("Site name is required.");
  if (!body.address?.trim()) throw new Error("Address is required.");
  const { error } = await db.from("customer_sites").insert({
    customer_id: body.customer_id,
    name: body.name.trim(),
    address: body.address.trim(),
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function updateSite(
  db: SupabaseClient,
  id: string,
  body: { name?: string; address?: string },
) {
  if (!body.name?.trim()) throw new Error("Site name is required.");
  if (!body.address?.trim()) throw new Error("Address is required.");
  const { error } = await db
    .from("customer_sites")
    .update({ name: body.name.trim(), address: body.address.trim() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteSite(
  db: SupabaseClient,
  id: string,
  restore: boolean,
) {
  const { error } = await db
    .from("customer_sites")
    .update({ deleted_at: restore ? null : nowIso() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function getSite(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("customer_sites")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Site not found.");
  return data;
}

export async function listContacts(
  db: SupabaseClient,
  customerId: string,
  pagination: PaginationInput,
  sort: SortInput,
  search?: string,
) {
  const { from, to } = paginationRange(pagination);
  const searchFilter = await buildSearchFilter(db, search, contactSearch);
  let query = db
    .from("customer_contacts")
    .select("*, customer_sites(name)", { count: "exact" })
    .eq("customer_id", customerId)
    .is("deleted_at", null);
  if (searchFilter) query = query.or(searchFilter);
  const { data, error, count } = await applyOrder(query, sort).range(from, to);
  if (error) throw new Error(error.message);
  return {
    rows: data ?? [],
    ...paginatedMeta(pagination.page, pagination.limit, count ?? 0),
  };
}

export async function createContact(
  db: SupabaseClient,
  body: Record<string, unknown>,
) {
  if (!body.customer_id) throw new Error("Missing customer.");
  if (!String(body.name ?? "").trim()) throw new Error("Contact name is required.");
  const { error } = await db.from("customer_contacts").insert({
    customer_id: body.customer_id,
    site_id: body.site_id || null,
    name: String(body.name).trim(),
    phone: body.phone || null,
    email: body.email || null,
    is_primary: Boolean(body.is_primary),
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function updateContact(
  db: SupabaseClient,
  id: string,
  body: Record<string, unknown>,
) {
  if (!String(body.name ?? "").trim()) throw new Error("Contact name is required.");
  const { error } = await db
    .from("customer_contacts")
    .update({
      site_id: body.site_id || null,
      name: String(body.name).trim(),
      phone: body.phone || null,
      email: body.email || null,
      is_primary: Boolean(body.is_primary),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteContact(
  db: SupabaseClient,
  id: string,
  restore: boolean,
) {
  const { error } = await db
    .from("customer_contacts")
    .update({ deleted_at: restore ? null : nowIso() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listInstructions(
  db: SupabaseClient,
  siteId: string,
  pagination: PaginationInput,
  sort: SortInput,
  search?: string,
) {
  const { from, to } = paginationRange(pagination);
  const searchFilter = await buildSearchFilter(db, search, instructionSearch);
  let query = db
    .from("site_instructions")
    .select("*", { count: "exact" })
    .eq("site_id", siteId)
    .is("deleted_at", null);
  if (searchFilter) query = query.or(searchFilter);
  const { data, error, count } = await applyOrder(query, sort).range(from, to);
  if (error) throw new Error(error.message);
  return {
    rows: data ?? [],
    ...paginatedMeta(pagination.page, pagination.limit, count ?? 0),
  };
}

export async function createInstruction(
  db: SupabaseClient,
  body: Record<string, unknown>,
) {
  if (!body.site_id) throw new Error("Missing site.");
  if (!String(body.instruction ?? "").trim()) {
    throw new Error("Instruction text is required.");
  }
  const { error } = await db.from("site_instructions").insert({
    site_id: body.site_id,
    instruction: String(body.instruction).trim(),
    title: body.title || null,
    category: body.category || "general",
    sort_order: Number(body.sort_order ?? 0),
    sensitive: Boolean(body.sensitive),
    image_url: body.image_url || null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function updateInstruction(
  db: SupabaseClient,
  id: string,
  body: Record<string, unknown>,
) {
  if (!String(body.instruction ?? "").trim()) {
    throw new Error("Instruction text is required.");
  }
  const { error } = await db
    .from("site_instructions")
    .update({
      instruction: String(body.instruction).trim(),
      title: body.title || null,
      category: body.category || "general",
      sort_order: Number(body.sort_order ?? 0),
      sensitive: Boolean(body.sensitive),
      image_url: body.image_url || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteInstruction(
  db: SupabaseClient,
  id: string,
  restore: boolean,
) {
  const { error } = await db
    .from("site_instructions")
    .update({ deleted_at: restore ? null : nowIso() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listProducts(
  db: SupabaseClient,
  pagination: PaginationInput,
  sort: SortInput,
  search?: string,
) {
  const { from, to } = paginationRange(pagination);
  const searchFilter = await buildSearchFilter(db, search, productSearch);
  let query = db
    .from("products")
    .select("*", { count: "exact" })
    .is("deleted_at", null);
  if (searchFilter) query = query.or(searchFilter);
  const { data, error, count } = await applyOrder(query, sort).range(from, to);
  if (error) throw new Error(error.message);
  return {
    rows: data ?? [],
    ...paginatedMeta(pagination.page, pagination.limit, count ?? 0),
  };
}

export async function listProductOptions(db: SupabaseClient) {
  const { data, error } = await db
    .from("products")
    .select("id,sku,name")
    .is("deleted_at", null)
    .order("name")
    .limit(500);
  if (error) throw new Error(error.message);
  return { products: data ?? [] };
}

export async function createProduct(
  db: SupabaseClient,
  body: Record<string, unknown>,
) {
  const sku = String(body.sku ?? "").trim();
  const name = String(body.name ?? "").trim();
  const defaultUnit = String(body.default_unit ?? "").trim();
  if (!sku) throw new Error("Product code is required.");
  if (!name) throw new Error("Name is required.");
  if (!defaultUnit) throw new Error("Default unit is required.");
  const { error } = await db.from("products").insert({
    sku,
    name,
    default_unit: defaultUnit,
    pack_size: body.pack_size ?? null,
    pack_unit: body.pack_unit ?? null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function updateProduct(
  db: SupabaseClient,
  id: string,
  body: Record<string, unknown>,
) {
  const sku = String(body.sku ?? "").trim();
  const name = String(body.name ?? "").trim();
  const defaultUnit = String(body.default_unit ?? "").trim();
  if (!sku) throw new Error("Product code is required.");
  if (!name) throw new Error("Name is required.");
  if (!defaultUnit) throw new Error("Default unit is required.");
  const { error } = await db
    .from("products")
    .update({
      sku,
      name,
      default_unit: defaultUnit,
      pack_size: body.pack_size ?? null,
      pack_unit: body.pack_unit ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteProduct(
  db: SupabaseClient,
  id: string,
  restore: boolean,
) {
  const { error } = await db
    .from("products")
    .update({ deleted_at: restore ? null : nowIso() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listSiteProducts(
  db: SupabaseClient,
  siteId: string,
  pagination: PaginationInput,
  sort: SortInput,
  search?: string,
) {
  const { from, to } = paginationRange(pagination);
  const searchFilter = await buildSearchFilter(db, search, siteProductSearch);
  let query = db
    .from("site_products")
    .select("*, products(sku, name)", { count: "exact" })
    .eq("site_id", siteId)
    .is("deleted_at", null);
  if (searchFilter) query = query.or(searchFilter);
  const { data, error, count } = await applyOrder(query, sort).range(from, to);
  if (error) throw new Error(error.message);
  return {
    rows: data ?? [],
    ...paginatedMeta(pagination.page, pagination.limit, count ?? 0),
  };
}

export async function createSiteProduct(
  db: SupabaseClient,
  body: Record<string, unknown>,
) {
  if (!body.site_id) throw new Error("Missing site.");
  if (!body.product_id) throw new Error("Product is required.");
  const minimum = Number(body.minimum_quantity);
  const uom = String(body.unit_of_measure ?? "").trim();
  if (!Number.isFinite(minimum) || minimum < 0) {
    throw new Error("Valid minimum quantity is required.");
  }
  if (!uom) throw new Error("Unit is required.");
  const { error } = await db.from("site_products").insert({
    site_id: body.site_id,
    product_id: body.product_id,
    minimum_quantity: minimum,
    unit_of_measure: uom,
    order_multiple: Number(body.order_multiple ?? 1),
    notes: body.notes ?? null,
  });
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function updateSiteProduct(
  db: SupabaseClient,
  id: string,
  body: Record<string, unknown>,
) {
  const minimum = Number(body.minimum_quantity);
  const uom = String(body.unit_of_measure ?? "").trim();
  if (!Number.isFinite(minimum) || minimum < 0) {
    throw new Error("Valid minimum quantity is required.");
  }
  if (!uom) throw new Error("Unit is required.");
  const { error } = await db
    .from("site_products")
    .update({
      minimum_quantity: minimum,
      unit_of_measure: uom,
      order_multiple: Number(body.order_multiple ?? 1),
      notes: body.notes ?? null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function deleteSiteProduct(
  db: SupabaseClient,
  id: string,
  restore: boolean,
) {
  const { error } = await db
    .from("site_products")
    .update({ deleted_at: restore ? null : nowIso() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listReps(
  db: SupabaseClient,
  pagination: PaginationInput,
  sort: SortInput,
  search?: string,
) {
  const { from, to } = paginationRange(pagination);
  const searchFilter = await buildSearchFilter(db, search, repSearch);
  let query = db
    .from("sales_reps")
    .select("id,employee_code,user_id,users(display_name,email)", { count: "exact" })
    .is("deleted_at", null);
  if (searchFilter) query = query.or(searchFilter);
  const { data, error, count } = await applyOrder(query, sort).range(from, to);
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((rep) => {
    const users = joinOne(rep.users);
    return {
      id: rep.id,
      employee_code: rep.employee_code,
      user_id: rep.user_id,
      display_name: users?.display_name ?? "",
      email: users?.email ?? "",
    };
  });
  return {
    rows,
    ...paginatedMeta(pagination.page, pagination.limit, count ?? 0),
  };
}

export async function createRep(db: SupabaseClient, body: Record<string, unknown>) {
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const displayName = String(body.display_name ?? "").trim();
  const employeeCode = body.employee_code ?? null;
  if (!email) throw new Error("Email is required.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  if (!displayName) throw new Error("Display name is required.");

  const { data: created, error: authError } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (authError || !created.user) {
    throw new Error(authError?.message ?? "Could not create this account.");
  }

  const { error: repError } = await db.from("sales_reps").insert({
    user_id: created.user.id,
    employee_code: employeeCode,
  });
  if (repError) throw new Error(repError.message);
  return { ok: true };
}

export async function updateRep(
  db: SupabaseClient,
  id: string,
  body: Record<string, unknown>,
) {
  const displayName = String(body.display_name ?? "").trim();
  const employeeCode = body.employee_code ?? null;
  if (!displayName) throw new Error("Display name is required.");

  const { data: rep, error: repLookupError } = await db
    .from("sales_reps")
    .select("user_id")
    .eq("id", id)
    .maybeSingle();
  if (repLookupError) throw new Error(repLookupError.message);
  if (!rep) throw new Error("Rep not found.");

  const { error: userError } = await db
    .from("users")
    .update({ display_name: displayName })
    .eq("id", rep.user_id);
  if (userError) throw new Error(userError.message);

  const { error: repError } = await db
    .from("sales_reps")
    .update({ employee_code: employeeCode })
    .eq("id", id);
  if (repError) throw new Error(repError.message);
  return { ok: true };
}

export async function deleteRep(
  db: SupabaseClient,
  id: string,
  restore: boolean,
) {
  const { error } = await db
    .from("sales_reps")
    .update({ deleted_at: restore ? null : nowIso() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function getRepAssignments(
  db: SupabaseClient,
  repId: string,
  pagination: PaginationInput,
  sort: SortInput,
  search?: string,
) {
  const { from, to } = paginationRange(pagination);
  const searchFilter = await buildSearchFilter(db, search, assignmentSearch);
  let customersQuery = db
    .from("customers")
    .select("*", { count: "exact" })
    .is("deleted_at", null);
  if (searchFilter) customersQuery = customersQuery.or(searchFilter);
  const [{ data: customers, error: cErr, count }, { data: assignments, error: aErr }] =
    await Promise.all([
      applyOrder(customersQuery, sort).range(from, to),
      db
        .from("sales_rep_customer_assignments")
        .select("customer_id")
        .eq("sales_rep_id", repId)
        .is("deleted_at", null),
    ]);
  if (cErr) throw new Error(cErr.message);
  if (aErr) throw new Error(aErr.message);
  const assignedIds = new Set((assignments ?? []).map((a) => a.customer_id));
  return {
    customers: (customers ?? []).map((c) => ({
      ...c,
      assigned: assignedIds.has(c.id),
    })),
    ...paginatedMeta(pagination.page, pagination.limit, count ?? 0),
  };
}

export async function setRepAssignment(
  db: SupabaseClient,
  repId: string,
  customerId: string,
  assigned: boolean,
) {
  const { data: existing } = await db
    .from("sales_rep_customer_assignments")
    .select("id")
    .eq("sales_rep_id", repId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (assigned) {
    if (existing) {
      const { error } = await db
        .from("sales_rep_customer_assignments")
        .update({ deleted_at: null })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await db
        .from("sales_rep_customer_assignments")
        .insert({ sales_rep_id: repId, customer_id: customerId });
      if (error) throw new Error(error.message);
    }
  } else if (existing) {
    const { error } = await db
      .from("sales_rep_customer_assignments")
      .update({ deleted_at: nowIso() })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  }
  return { ok: true };
}

export async function listOrders(
  db: SupabaseClient,
  pagination: PaginationInput,
  sort: SortInput,
  search?: string,
) {
  const { from, to } = paginationRange(pagination);
  const searchFilter = await buildSearchFilter(db, search, orderSearch);
  let query = db
    .from("stock_counts")
    .select(
      "id,status,started_at,completed_at,customers(name),customer_sites(name),sales_reps(users(display_name)),stock_count_exports(file_name,email_status,generated_status)",
      { count: "exact" },
    )
    .is("deleted_at", null);
  if (searchFilter) query = query.or(searchFilter);
  const { data, error, count } = await applyOrder(query, sort).range(from, to);
  if (error) throw new Error(error.message);
  return {
    orders: data ?? [],
    ...paginatedMeta(pagination.page, pagination.limit, count ?? 0),
  };
}

export async function getOrder(db: SupabaseClient, id: string) {
  const { data, error } = await db
    .from("stock_counts")
    .select(
      "*,customers(name),customer_sites(name,address),sales_reps(users(display_name,email)),stock_count_items(*),stock_count_exports(*)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Order not found.");
  return data;
}

export async function rejectOrder(
  db: SupabaseClient,
  id: string,
  reason: string,
) {
  if (!reason.trim()) throw new Error("A rejection reason is required.");
  const { data, error } = await db
    .from("stock_counts")
    .update({ status: "rejected", rejection_reason: reason.trim() })
    .eq("id", id)
    .eq("status", "completed")
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("Only completed orders can be rejected.");
  return { ok: true, message: "Order rejected." };
}

export async function getOrderExportUrl(db: SupabaseClient, stockCountId: string) {
  const { data: exportRow } = await db
    .from("stock_count_exports")
    .select("storage_path")
    .eq("stock_count_id", stockCountId)
    .maybeSingle();
  const path = exportRow?.storage_path;
  if (!path) throw new Error("Report not found.");
  const { data: signed } = await db.storage
    .from(EXPORT_BUCKET)
    .createSignedUrl(path, 120);
  if (!signed?.signedUrl) throw new Error("Could not download the report.");
  return { url: signed.signedUrl };
}

export async function listAdmins(
  db: SupabaseClient,
  pagination: PaginationInput,
  sort: SortInput,
  search?: string,
) {
  const { from, to } = paginationRange(pagination);
  const searchFilter = await buildSearchFilter(db, search, adminSearch);
  let query = db
    .from("admin_users")
    .select("user_id,role,users(display_name,email)", { count: "exact" })
    .is("deleted_at", null);
  if (searchFilter) query = query.or(searchFilter);
  const { data, error, count } = await applyOrder(query, sort).range(from, to);
  if (error) throw new Error(error.message);
  const rows = (data ?? []).map((admin) => {
    const users = joinOne(admin.users);
    return {
      user_id: admin.user_id,
      role: admin.role,
      display_name: users?.display_name ?? "",
      email: users?.email ?? "",
    };
  });
  return {
    rows,
    ...paginatedMeta(pagination.page, pagination.limit, count ?? 0),
  };
}

export async function createAdmin(
  db: SupabaseClient,
  body: Record<string, unknown>,
) {
  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const displayName = String(body.display_name ?? "").trim();
  const role = String(body.role ?? "admin");
  if (!email) throw new Error("Email is required.");

  const { data: existingUser } = await db
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let userId = existingUser?.id as string | undefined;

  if (!userId) {
    if (password.length < 8) {
      throw new Error("New accounts need a password of at least 8 characters.");
    }
    const { data: created, error: authError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName || email },
    });
    if (authError || !created.user) {
      throw new Error(authError?.message ?? "Could not create this account.");
    }
    userId = created.user.id;
  } else if (displayName) {
    await db.from("users").update({ display_name: displayName }).eq("id", userId);
  }

  const { error: adminError } = await db
    .from("admin_users")
    .upsert({ user_id: userId, role, deleted_at: null }, { onConflict: "user_id" });
  if (adminError) throw new Error(adminError.message);
  return { ok: true };
}

export async function updateAdmin(
  db: SupabaseClient,
  userId: string,
  body: Record<string, unknown>,
) {
  const role = String(body.role ?? "admin");
  const displayName = String(body.display_name ?? "").trim();
  const { error: adminError } = await db
    .from("admin_users")
    .update({ role })
    .eq("user_id", userId);
  if (adminError) throw new Error(adminError.message);
  if (displayName) {
    const { error: userError } = await db
      .from("users")
      .update({ display_name: displayName })
      .eq("id", userId);
    if (userError) throw new Error(userError.message);
  }
  return { ok: true };
}

export async function deleteAdmin(
  db: SupabaseClient,
  session: AdminSession,
  userId: string,
  restore: boolean,
) {
  if (!restore && session.userId === userId) {
    throw new Error("You cannot remove your own admin access.");
  }
  const { error } = await db
    .from("admin_users")
    .update({ deleted_at: restore ? null : nowIso() })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { ok: true };
}

export async function listDevices(
  db: SupabaseClient,
  pagination: PaginationInput,
  sort: SortInput,
  search?: string,
) {
  const { from, to } = paginationRange(pagination);
  const searchFilter = await buildSearchFilter(db, search, deviceSearch);
  let query = db
    .from("devices")
    .select("id,name,platform,last_seen_at,revoked_at,users(display_name,email)", {
      count: "exact",
    });
  if (searchFilter) query = query.or(searchFilter);
  const { data, error, count } = await applyOrder(query, sort).range(from, to);
  if (error) throw new Error(error.message);
  return {
    devices: data ?? [],
    ...paginatedMeta(pagination.page, pagination.limit, count ?? 0),
  };
}

export async function setDeviceRevoked(
  db: SupabaseClient,
  id: string,
  revoked: boolean,
) {
  const { error } = await db
    .from("devices")
    .update({ revoked_at: revoked ? nowIso() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  return { ok: true };
}
