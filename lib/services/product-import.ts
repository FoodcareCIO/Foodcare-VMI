import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { readSheet, type CellValue, type SheetData } from "read-excel-file/node";

import type {
  ProductImportAction,
  ProductImportError,
  ProductImportFormat,
  ProductImportPreview,
  ProductImportResult,
  ProductImportSite,
} from "@/lib/product-import-types";

export const PRODUCT_IMPORT_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const PRODUCT_IMPORT_MAX_ROWS = 5000;

type ProductColumn =
  | "sku"
  | "name"
  | "default_unit"
  | "pack_size"
  | "pack_unit"
  | "minimum_quantity";

interface ParsedProduct {
  row: number;
  sku: string;
  name: string;
  default_unit: string | null;
  pack_size: number | null;
  pack_unit: string | null;
  minimum_quantity: number | null;
  minimum_unit: string | null;
  minimum_notes: string | null;
}

interface ParsedImport {
  format: ProductImportFormat;
  customerName: string | null;
  address: string | null;
  totalRows: number;
  products: ParsedProduct[];
  errors: ProductImportError[];
  invalidRows: number;
}

interface ExistingProduct {
  id: string;
  sku: string;
  default_unit: string;
  pack_size: number | null;
  pack_unit: string | null;
  deleted_at: string | null;
}

interface ExistingSiteProduct {
  product_id: string;
  deleted_at: string | null;
  unit_of_measure: string;
  order_multiple: number;
  notes: string | null;
  products: { sku: string } | { sku: string }[];
}

interface ResolvedProduct extends ParsedProduct {
  default_unit: string;
}

const MAX_RETURNED_ERRORS = 100;
const MAX_SAMPLE_ROWS = 12;

const HEADER_ALIASES: Record<string, ProductColumn> = {
  sku: "sku",
  code: "sku",
  "product code": "sku",
  "product name": "name",
  "item description": "name",
  name: "name",
  "default unit": "default_unit",
  unit: "default_unit",
  "pack size": "pack_size",
  "pack unit": "pack_unit",
  "minimum stock": "minimum_quantity",
  "minium stock": "minimum_quantity",
  minimum: "minimum_quantity",
};

const normalizeText = (value: unknown): string =>
  String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const normalizeMatch = (value: unknown): string =>
  normalizeText(value).replace(/[^a-z0-9]+/g, " ").trim();

const displayField = (field: ProductColumn): string =>
  ({
    sku: "Product code",
    name: "Product name",
    default_unit: "Default unit",
    pack_size: "Pack size",
    pack_unit: "Pack unit",
    minimum_quantity: "Minimum stock",
  })[field];

function parseCsv(text: string): SheetData {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        value += character;
      }
      continue;
    }
    if (character === '"' && value.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }
  if (quoted) throw new Error("The CSV contains an unclosed quoted value.");
  if (value.length > 0 || row.length > 0) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

async function readRows(file: File): Promise<SheetData> {
  const extension = file.name.split(".").pop()?.toLocaleLowerCase("en-US");
  if (extension !== "xlsx" && extension !== "csv") {
    throw new Error("Choose an .xlsx or .csv file.");
  }
  if (file.size === 0) throw new Error("The selected file is empty.");
  if (file.size > PRODUCT_IMPORT_MAX_FILE_SIZE) {
    throw new Error("The selected file is larger than 5 MB.");
  }
  if (extension === "csv") {
    return parseCsv(new TextDecoder("utf-8").decode(await file.arrayBuffer()));
  }
  try {
    return await readSheet(Buffer.from(await file.arrayBuffer()));
  } catch {
    throw new Error("The Excel workbook could not be read. Upload a valid .xlsx file.");
  }
}

const cellText = (value: CellValue | null | undefined): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
};

function parseMinimum(value: string) {
  if (!value) return { quantity: 0, unit: null, notes: null, error: null };
  const numeric = Number(value.replace(/,/g, ""));
  if (Number.isFinite(numeric) && numeric >= 0) {
    return { quantity: numeric, unit: null, notes: null, error: null };
  }
  const match = value.match(/^\s*(\d+(?:\.\d+)?)\s*([^\s/]*)/);
  if (!match) {
    return { quantity: null, unit: null, notes: null, error: "Minimum stock must start with a number." };
  }
  const rawUnit = match[2].toLocaleLowerCase("en-US");
  const unit =
    rawUnit === "carton" || rawUnit === "cartons"
      ? "ctn"
      : rawUnit === "bx"
        ? "box"
        : rawUnit || null;
  return { quantity: Number(match[1]), unit, notes: `Sheet par: ${value}`, error: null };
}

function inferUnit(description: string): string {
  const text = description.toLocaleLowerCase("en-US");
  if (/\b(ctn|cartons?)\b/.test(text)) return "ctn";
  if (/\b(box|boxes)\b/.test(text)) return "box";
  if (/\b(each)\b/.test(text)) return "each";
  if (/\b(pairs?)\b/.test(text)) return "pair";
  if (/\b(rolls?)\b/.test(text)) return "roll";
  if (/\b(pack|packs|pk)\s*\d*/.test(text)) return "pack";
  return "ea";
}

async function parseProductFile(file: File): Promise<ParsedImport> {
  const rows = await readRows(file);
  while (rows.length && rows.at(-1)?.every((cell) => cellText(cell) === "")) rows.pop();
  if (rows.length === 0) throw new Error("The spreadsheet is empty.");

  let headerRowIndex = -1;
  for (let index = 0; index < Math.min(rows.length, 30); index += 1) {
    const fields = new Set(
      rows[index].map((cell) => HEADER_ALIASES[normalizeText(cell)]).filter(Boolean),
    );
    if (fields.has("sku") && fields.has("name")) {
      headerRowIndex = index;
      break;
    }
  }
  if (headerRowIndex < 0) {
    throw new Error("Could not find a header row containing Product code/Code and Product name/Item Description.");
  }
  if (rows.length - headerRowIndex - 1 > PRODUCT_IMPORT_MAX_ROWS) {
    throw new Error(`The spreadsheet exceeds the ${PRODUCT_IMPORT_MAX_ROWS.toLocaleString()} row limit.`);
  }

  const errors: ProductImportError[] = [];
  const invalidRows = new Set<number>();
  const headerIndexes = new Map<ProductColumn, number>();
  const headerRow = headerRowIndex + 1;
  rows[headerRowIndex].forEach((cell, index) => {
    const field = HEADER_ALIASES[normalizeText(cell)];
    if (!field) return;
    if (headerIndexes.has(field)) {
      errors.push({ row: headerRow, field, message: `${displayField(field)} appears more than once.` });
      invalidRows.add(headerRow);
    } else {
      headerIndexes.set(field, index);
    }
  });

  const format: ProductImportFormat = headerIndexes.has("minimum_quantity") ? "vmi" : "catalog";
  const required: ProductColumn[] =
    format === "vmi" ? ["sku", "name", "minimum_quantity"] : ["sku", "name", "default_unit"];
  for (const field of required) {
    if (!headerIndexes.has(field)) {
      errors.push({ row: headerRow, field, message: `Missing required column: ${displayField(field)}.` });
      invalidRows.add(headerRow);
    }
  }

  let customerName: string | null = null;
  let address: string | null = null;
  if (format === "vmi") {
    for (const row of rows.slice(0, headerRowIndex)) {
      if (normalizeMatch(cellText(row[0])) === "name" && cellText(row[1])) customerName = cellText(row[1]);
      const candidate = cellText(row[1]);
      if (/\bNSW\b/i.test(candidate) && /\d{4}/.test(candidate)) address = candidate;
    }
    if (!customerName) {
      errors.push({ row: 1, message: "The VMI workbook is missing its customer Name value." });
      invalidRows.add(1);
    }
  }

  const candidates: ParsedProduct[] = [];
  if (!invalidRows.has(headerRow)) {
    for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
      const spreadsheetRow = index + 1;
      const row = rows[index];
      if (row.every((cell) => cellText(cell) === "")) continue;
      const get = (field: ProductColumn): string => {
        const column = headerIndexes.get(field);
        return column === undefined ? "" : cellText(row[column]);
      };
      const sku = get("sku");
      const name = get("name");
      if (format === "vmi" && !sku) continue;
      if (!sku) {
        errors.push({ row: spreadsheetRow, field: "sku", message: "Product code is required." });
        invalidRows.add(spreadsheetRow);
      }
      if (!name) {
        errors.push({ row: spreadsheetRow, field: "name", message: "Product name is required." });
        invalidRows.add(spreadsheetRow);
      }
      const defaultUnit = get("default_unit");
      if (format === "catalog" && !defaultUnit) {
        errors.push({ row: spreadsheetRow, field: "default_unit", message: "Default unit is required." });
        invalidRows.add(spreadsheetRow);
      }
      const packSizeText = get("pack_size");
      let packSize: number | null = null;
      if (packSizeText) {
        packSize = Number(packSizeText.replace(/,/g, ""));
        if (!Number.isFinite(packSize) || packSize <= 0) {
          errors.push({ row: spreadsheetRow, field: "pack_size", message: "Pack size must be a number greater than zero." });
          invalidRows.add(spreadsheetRow);
        }
      }
      const minimum =
        format === "vmi"
          ? parseMinimum(get("minimum_quantity"))
          : { quantity: null, unit: null, notes: null, error: null };
      if (minimum.error) {
        errors.push({ row: spreadsheetRow, field: "minimum_quantity", message: minimum.error });
        invalidRows.add(spreadsheetRow);
      }
      candidates.push({
        row: spreadsheetRow,
        sku,
        name,
        default_unit: defaultUnit || null,
        pack_size: packSize,
        pack_unit: get("pack_unit") || null,
        minimum_quantity: minimum.quantity,
        minimum_unit: minimum.unit,
        minimum_notes: minimum.notes,
      });
    }
  }

  const skuRows = new Map<string, number[]>();
  for (const product of candidates) {
    if (!product.sku) continue;
    const key = product.sku.toLocaleLowerCase("en-US");
    skuRows.set(key, [...(skuRows.get(key) ?? []), product.row]);
  }
  for (const duplicateRows of skuRows.values()) {
    if (duplicateRows.length < 2) continue;
    const rowList = duplicateRows.join(", ");
    for (const row of duplicateRows) {
      errors.push({ row, field: "sku", message: `Duplicate product code in spreadsheet rows ${rowList}.` });
      invalidRows.add(row);
    }
  }
  if (candidates.length === 0) {
    errors.push({ row: headerRow, message: "No product rows were found below the header." });
    invalidRows.add(headerRow);
  }
  return {
    format,
    customerName,
    address,
    totalRows: candidates.length,
    products: candidates.filter((product) => !invalidRows.has(product.row)),
    errors,
    invalidRows: invalidRows.size,
  };
}

async function findExistingProducts(db: SupabaseClient, products: ParsedProduct[]) {
  const existing = new Map<string, ExistingProduct>();
  const skus = products.map((product) => product.sku);
  for (let index = 0; index < skus.length; index += 200) {
    const { data, error } = await db
      .from("products")
      .select("id,sku,default_unit,pack_size,pack_unit,deleted_at")
      .in("sku", skus.slice(index, index + 200));
    if (error) throw new Error(error.message);
    for (const product of (data ?? []) as ExistingProduct[]) {
      existing.set(product.sku.toLocaleLowerCase("en-US"), product);
    }
  }
  return existing;
}

function resolveProducts(parsed: ParsedImport, existing: Map<string, ExistingProduct>): ResolvedProduct[] {
  return parsed.products.map((product) => {
    const match = existing.get(product.sku.toLocaleLowerCase("en-US"));
    if (parsed.format === "catalog") return { ...product, default_unit: product.default_unit! };
    return {
      ...product,
      default_unit: match?.default_unit ?? inferUnit(product.name),
      pack_size: match?.pack_size ?? null,
      pack_unit: match?.pack_unit ?? null,
    };
  });
}

const actionFor = (product: ParsedProduct, existing: Map<string, ExistingProduct>): ProductImportAction => {
  const match = existing.get(product.sku.toLocaleLowerCase("en-US"));
  if (!match) return "create";
  return match.deleted_at ? "restore" : "update";
};

async function findImportSite(db: SupabaseClient, parsed: ParsedImport): Promise<ProductImportSite | null> {
  if (parsed.format !== "vmi") return null;
  const { data, error } = await db
    .from("customer_sites")
    .select("id,name,address,customers(name)")
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  const expectedCustomer = normalizeMatch(parsed.customerName);
  const candidates = (data ?? []).filter((row) => {
    const joined = row.customers as { name?: string } | { name?: string }[] | null;
    const customer = Array.isArray(joined) ? joined[0] : joined;
    return normalizeMatch(customer?.name) === expectedCustomer;
  });
  const addressMatch = parsed.address
    ? candidates.find((row) => normalizeMatch(row.address) === normalizeMatch(parsed.address))
    : undefined;
  const match = addressMatch ?? (candidates.length === 1 ? candidates[0] : null);
  if (!match) {
    throw new Error(
      candidates.length > 1
        ? `More than one site matches ${parsed.customerName}; its workbook address did not match exactly.`
        : `No active customer site matches the workbook name ${parsed.customerName}.`,
    );
  }
  const joined = match.customers as { name?: string } | { name?: string }[] | null;
  const customer = Array.isArray(joined) ? joined[0] : joined;
  return {
    id: String(match.id),
    customerName: customer?.name ?? parsed.customerName ?? "Unknown customer",
    siteName: String(match.name),
    address: String(match.address ?? ""),
  };
}

async function findExistingSiteProducts(db: SupabaseClient, site: ProductImportSite | null) {
  const existing = new Map<string, ExistingSiteProduct>();
  if (!site) return existing;
  const { data, error } = await db
    .from("site_products")
    .select("product_id,deleted_at,unit_of_measure,order_multiple,notes,products!inner(sku)")
    .eq("site_id", site.id);
  if (error) throw new Error(error.message);
  for (const row of (data ?? []) as ExistingSiteProduct[]) {
    const joined = Array.isArray(row.products) ? row.products[0] : row.products;
    if (joined?.sku) existing.set(joined.sku.toLocaleLowerCase("en-US"), row);
  }
  return existing;
}

function minimumActionFor(product: ResolvedProduct, existing: Map<string, ExistingSiteProduct>) {
  const match = existing.get(product.sku.toLocaleLowerCase("en-US"));
  if (!match) return "create" as const;
  return match.deleted_at ? ("restore" as const) : ("update" as const);
}

export async function previewProductImport(db: SupabaseClient, file: File): Promise<ProductImportPreview> {
  const parsed = await parseProductFile(file);
  const [existingProducts, site] = await Promise.all([
    findExistingProducts(db, parsed.products),
    findImportSite(db, parsed),
  ]);
  const products = resolveProducts(parsed, existingProducts);
  const existingMinimums = await findExistingSiteProducts(db, site);
  const actions = products.map((product) => actionFor(product, existingProducts));
  const minimumActions = site ? products.map((product) => minimumActionFor(product, existingMinimums)) : [];
  return {
    format: parsed.format,
    site,
    fileName: file.name,
    totalRows: parsed.totalRows,
    validRows: products.length,
    invalidRows: parsed.invalidRows,
    createCount: actions.filter((action) => action === "create").length,
    updateCount: actions.filter((action) => action === "update").length,
    restoreCount: actions.filter((action) => action === "restore").length,
    minimumCreateCount: minimumActions.filter((action) => action === "create").length,
    minimumUpdateCount: minimumActions.filter((action) => action === "update").length,
    minimumRestoreCount: minimumActions.filter((action) => action === "restore").length,
    errors: parsed.errors.slice(0, MAX_RETURNED_ERRORS),
    errorsTruncated: parsed.errors.length > MAX_RETURNED_ERRORS,
    sample: products.slice(0, MAX_SAMPLE_ROWS).map((product) => {
      const current = existingMinimums.get(product.sku.toLocaleLowerCase("en-US"));
      return {
        row: product.row,
        sku: product.sku,
        name: product.name,
        defaultUnit: product.default_unit,
        packSize: product.pack_size,
        packUnit: product.pack_unit,
        minimumQuantity: product.minimum_quantity,
        minimumUnit: product.minimum_unit ?? current?.unit_of_measure ?? product.default_unit,
        action: actionFor(product, existingProducts),
      };
    }),
    canImport: parsed.errors.length === 0 && products.length > 0,
  };
}

export async function importProducts(db: SupabaseClient, file: File): Promise<ProductImportResult> {
  const parsed = await parseProductFile(file);
  if (parsed.errors.length > 0) {
    throw new Error(`The spreadsheet contains ${parsed.invalidRows} invalid row(s). Preview it again and fix the errors.`);
  }
  if (parsed.products.length === 0) throw new Error("The spreadsheet has no products to import.");

  const [existingProducts, site] = await Promise.all([
    findExistingProducts(db, parsed.products),
    findImportSite(db, parsed),
  ]);
  const products = resolveProducts(parsed, existingProducts);
  const existingMinimums = await findExistingSiteProducts(db, site);
  const actions = products.map((product) => actionFor(product, existingProducts));
  const productRows = products.map((product) => ({
    sku: product.sku,
    name: product.name,
    default_unit: product.default_unit,
    pack_size: product.pack_size,
    pack_unit: product.pack_unit,
    deleted_at: null,
  }));
  const { error: productError } = await db.from("products").upsert(productRows, { onConflict: "sku" });
  if (productError) throw new Error(productError.message);

  let minimumActions: ProductImportAction[] = [];
  if (site) {
    const refreshedProducts = await findExistingProducts(db, parsed.products);
    const minimumRows = products.map((product) => {
      const key = product.sku.toLocaleLowerCase("en-US");
      const productId = refreshedProducts.get(key)?.id;
      if (!productId) throw new Error(`Could not resolve imported product ${product.sku}.`);
      const current = existingMinimums.get(key);
      return {
        site_id: site.id,
        product_id: productId,
        minimum_quantity: product.minimum_quantity ?? 0,
        unit_of_measure: product.minimum_unit ?? current?.unit_of_measure ?? product.default_unit,
        order_multiple: current?.order_multiple ?? 1,
        notes: product.minimum_notes ?? current?.notes ?? null,
        deleted_at: null,
      };
    });
    minimumActions = products.map((product) => minimumActionFor(product, existingMinimums));
    const { error: minimumError } = await db
      .from("site_products")
      .upsert(minimumRows, { onConflict: "site_id,product_id" });
    if (minimumError) throw new Error(`Products were imported, but site minimums failed: ${minimumError.message}`);
  }

  return {
    ok: true,
    format: parsed.format,
    site,
    imported: productRows.length,
    created: actions.filter((action) => action === "create").length,
    updated: actions.filter((action) => action === "update").length,
    restored: actions.filter((action) => action === "restore").length,
    minimumsImported: site ? products.length : 0,
    minimumsCreated: minimumActions.filter((action) => action === "create").length,
    minimumsUpdated: minimumActions.filter((action) => action === "update").length,
    minimumsRestored: minimumActions.filter((action) => action === "restore").length,
  };
}
