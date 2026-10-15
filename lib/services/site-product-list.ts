import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  SiteProductListInfo,
  SiteProductListPreview,
  SiteProductListResult,
  SiteProductListRow,
  SiteProductListUpload,
} from "@/lib/product-import-types";
import { skuKey } from "@/lib/product-sheet";
import { findProductsBySku, readSpreadsheet } from "@/lib/services/product-import";
import {
  assertReplaceAllowed,
  buildSiteListPreview,
  findRenamedProducts,
  parseSiteProductSheet,
  resolveSiteProductRows,
  type SiteRowDefaults,
} from "@/lib/site-product-list";

const HISTORY_COLUMNS =
  "id,kind,file_name,uploaded_at,version,added_count,updated_count,removed_count,unchanged_count,restored_from,users(display_name)";

function joinOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

async function getActiveSite(db: SupabaseClient, siteId: string) {
  const { data, error } = await db
    .from("customer_sites")
    .select("id,name,product_list_version,product_list_updated_at")
    .eq("id", siteId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Site not found.");
  return data as SiteProductListInfo["site"];
}

/** The site's active list exactly as the tablet shows it. */
async function currentSiteList(db: SupabaseClient, siteId: string): Promise<SiteProductListRow[]> {
  const { data, error } = await db.rpc("site_product_list_json", { p_site_id: siteId });
  if (error) throw new Error(error.message);
  return (data ?? []) as SiteProductListRow[];
}

async function siteRowDefaults(db: SupabaseClient, siteId: string) {
  const { data, error } = await db
    .from("site_products")
    .select("unit_of_measure,order_multiple,notes,products!inner(sku)")
    .eq("site_id", siteId);
  if (error) throw new Error(error.message);
  const defaults = new Map<string, SiteRowDefaults>();
  for (const row of data ?? []) {
    const product = joinOne(row.products as { sku: string } | { sku: string }[]);
    if (product?.sku) defaults.set(skuKey(product.sku), row as SiteRowDefaults);
  }
  return defaults;
}

/** Number of other active sites that list each product. */
async function otherSiteUsage(db: SupabaseClient, siteId: string, productIds: string[]) {
  const usage = new Map<string, number>();
  const rows: { product_id: string; site_id: string }[] = [];
  for (let index = 0; index < productIds.length; index += 200) {
    const { data, error } = await db
      .from("site_products")
      .select("product_id,site_id")
      .in("product_id", productIds.slice(index, index + 200))
      .neq("site_id", siteId)
      .is("deleted_at", null);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
  }
  const siteIds = [...new Set(rows.map((row) => String(row.site_id)))];
  if (siteIds.length === 0) return usage;
  const { data: sites, error: siteError } = await db
    .from("customer_sites")
    .select("id")
    .in("id", siteIds)
    .is("deleted_at", null);
  if (siteError) throw new Error(siteError.message);
  const activeSites = new Set((sites ?? []).map((site) => String(site.id)));
  for (const row of rows) {
    if (!activeSites.has(String(row.site_id))) continue;
    const productId = String(row.product_id);
    usage.set(productId, (usage.get(productId) ?? 0) + 1);
  }
  return usage;
}

async function analyseSiteFile(db: SupabaseClient, siteId: string, file: File) {
  const [site, sheet] = await Promise.all([getActiveSite(db, siteId), readSpreadsheet(file)]);
  const parsed = parseSiteProductSheet(sheet);
  const [products, siteRows, current] = await Promise.all([
    findProductsBySku(db, parsed.rows.map((row) => row.sku)),
    siteRowDefaults(db, siteId),
    currentSiteList(db, siteId),
  ]);
  const rows = resolveSiteProductRows(parsed, products, siteRows);
  const renamed = findRenamedProducts(rows, products);
  const usage = await otherSiteUsage(db, siteId, renamed.map((product) => product.productId));
  const preview = buildSiteListPreview({
    site: { id: site.id, name: site.name, version: site.product_list_version },
    fileName: file.name,
    parsed,
    rows,
    current,
    renamedShared: renamed
      .filter((product) => usage.has(product.productId))
      .map(({ sku, oldName, newName, productId }) => ({
        sku,
        oldName,
        newName,
        otherSites: usage.get(productId) ?? 0,
      })),
  });
  return { preview, rows };
}

export async function previewSiteProductList(
  db: SupabaseClient,
  siteId: string,
  file: File,
): Promise<SiteProductListPreview> {
  return (await analyseSiteFile(db, siteId, file)).preview;
}

export async function replaceSiteProductList(
  db: SupabaseClient,
  actorId: string,
  siteId: string,
  file: File,
  options: { expectedVersion: number; confirmSiteMismatch: boolean; confirmLargeRemoval: boolean },
): Promise<SiteProductListResult> {
  // The file is parsed again here; the browser's preview is never trusted.
  const { preview, rows } = await analyseSiteFile(db, siteId, file);
  assertReplaceAllowed(preview, {
    siteMismatch: options.confirmSiteMismatch,
    largeRemoval: options.confirmLargeRemoval,
  });
  const fileSha256 = createHash("sha256")
    .update(Buffer.from(await file.arrayBuffer()))
    .digest("hex");
  const { data, error } = await db.rpc("replace_site_product_list", {
    p_site_id: siteId,
    p_rows: rows,
    p_file_name: file.name,
    p_file_sha256: fileSha256,
    p_actor: actorId,
    p_expected_version: options.expectedVersion,
    p_kind: "upload",
    p_restored_from: null,
  });
  if (error) throw new Error(error.message);
  return data as SiteProductListResult;
}

export async function listSiteProductListHistory(
  db: SupabaseClient,
  siteId: string,
  limit = 200,
): Promise<SiteProductListUpload[]> {
  const { data, error } = await db
    .from("site_product_list_uploads")
    .select(HISTORY_COLUMNS)
    .eq("site_id", siteId)
    .order("uploaded_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(({ users, ...upload }) => ({
    ...(upload as Omit<SiteProductListUpload, "uploaded_by_name">),
    uploaded_by_name: joinOne(users)?.display_name ?? null,
  }));
}

export async function getSiteProductList(db: SupabaseClient, siteId: string): Promise<SiteProductListInfo> {
  const [site, products, uploads] = await Promise.all([
    getActiveSite(db, siteId),
    currentSiteList(db, siteId),
    listSiteProductListHistory(db, siteId, 1),
  ]);
  return { site, lastUpload: uploads[0] ?? null, products };
}

export async function restoreSiteProductList(
  db: SupabaseClient,
  actorId: string,
  siteId: string,
  uploadId: string,
): Promise<SiteProductListResult> {
  const { data: upload, error } = await db
    .from("site_product_list_uploads")
    .select("id,site_id")
    .eq("id", uploadId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!upload || String(upload.site_id).toLowerCase() !== siteId.toLowerCase()) {
    throw new Error("This history entry was not found for this site.");
  }
  const { data, error: restoreError } = await db.rpc("restore_site_product_list", {
    p_upload_id: uploadId,
    p_actor: actorId,
  });
  if (restoreError) throw new Error(restoreError.message);
  return data as SiteProductListResult;
}
