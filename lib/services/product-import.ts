import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { readSheet, type SheetData } from "read-excel-file/node";

import type {
  ProductImportAction,
  ProductImportError,
  ProductImportPreview,
  ProductImportResult,
} from "@/lib/product-import-types";
import {
  MAX_RETURNED_ERRORS,
  PRODUCT_IMPORT_MAX_FILE_SIZE,
  columnReader,
  findHeader,
  flagDuplicateCodes,
  isEmptyRow,
  parseCsv,
  parsePackSize,
  requireColumns,
  skuKey,
} from "@/lib/product-sheet";
import type { CatalogueProduct } from "@/lib/site-product-list";

export { PRODUCT_IMPORT_MAX_FILE_SIZE } from "@/lib/product-sheet";

export const SITE_LIST_IN_CATALOGUE_MESSAGE =
  "This is a site product list. Open Sites → the site → Upload site product list.";

const MAX_SAMPLE_ROWS = 12;

interface CatalogueRow {
  row: number;
  sku: string;
  name: string;
  default_unit: string;
  pack_size: number | null;
  pack_unit: string | null;
}

interface ParsedCatalogue {
  totalRows: number;
  products: CatalogueRow[];
  errors: ProductImportError[];
  invalidRows: number;
}

export interface ExistingProduct extends CatalogueProduct {
  deleted_at: string | null;
}

export async function readSpreadsheet(file: File): Promise<SheetData> {
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

// The catalogue import only adds and updates products; it never changes which
// products a site has. Site lists (with a minimum stock column) are rejected.
async function parseCatalogueFile(file: File): Promise<ParsedCatalogue> {
  const sheet = await readSpreadsheet(file);
  const header = findHeader(sheet);
  if (header.columns.has("minimum_quantity")) throw new Error(SITE_LIST_IN_CATALOGUE_MESSAGE);
  requireColumns(header, ["sku", "name", "default_unit"]);
  const errors = [...header.errors];
  const invalidRows = new Set(errors.map((error) => error.row));

  const candidates: CatalogueRow[] = [];
  if (errors.length === 0) {
    for (let index = header.index + 1; index < sheet.length; index += 1) {
      const row = sheet[index];
      if (isEmptyRow(row)) continue;
      const spreadsheetRow = index + 1;
      const get = columnReader(header, row);
      const rowError = (field: string, message: string) => {
        errors.push({ row: spreadsheetRow, field, message });
        invalidRows.add(spreadsheetRow);
      };
      const sku = get("sku");
      const name = get("name");
      const defaultUnit = get("default_unit");
      if (!sku) rowError("sku", "Product code is required.");
      if (!name) rowError("name", "Product name is required.");
      if (!defaultUnit) rowError("default_unit", "Default unit is required.");
      const packSize = parsePackSize(get("pack_size"));
      if (packSize.error) rowError("pack_size", packSize.error);
      candidates.push({
        row: spreadsheetRow,
        sku,
        name,
        default_unit: defaultUnit,
        pack_size: packSize.value,
        pack_unit: get("pack_unit") || null,
      });
    }
    flagDuplicateCodes(candidates, errors, invalidRows);
    if (candidates.length === 0) {
      errors.push({ row: header.row, message: "No product rows were found below the header." });
      invalidRows.add(header.row);
    }
  }
  errors.sort((left, right) => left.row - right.row);
  return {
    totalRows: candidates.length,
    products: candidates.filter((product) => !invalidRows.has(product.row)),
    errors,
    invalidRows: invalidRows.size,
  };
}

/** Products (including removed ones) keyed by lower-case product code. */
export async function findProductsBySku(db: SupabaseClient, skus: string[]) {
  const existing = new Map<string, ExistingProduct>();
  for (let index = 0; index < skus.length; index += 200) {
    const { data, error } = await db
      .from("products")
      .select("id,sku,name,default_unit,pack_size,pack_unit,deleted_at")
      .in("sku", skus.slice(index, index + 200));
    if (error) throw new Error(error.message);
    for (const product of (data ?? []) as ExistingProduct[]) {
      existing.set(skuKey(product.sku), product);
    }
  }
  return existing;
}

const actionFor = (product: CatalogueRow, existing: Map<string, ExistingProduct>): ProductImportAction => {
  const match = existing.get(skuKey(product.sku));
  if (!match) return "create";
  return match.deleted_at ? "restore" : "update";
};

export async function previewProductImport(db: SupabaseClient, file: File): Promise<ProductImportPreview> {
  const parsed = await parseCatalogueFile(file);
  const existing = await findProductsBySku(db, parsed.products.map((product) => product.sku));
  const actions = parsed.products.map((product) => actionFor(product, existing));
  return {
    fileName: file.name,
    totalRows: parsed.totalRows,
    validRows: parsed.products.length,
    invalidRows: parsed.invalidRows,
    createCount: actions.filter((action) => action === "create").length,
    updateCount: actions.filter((action) => action === "update").length,
    restoreCount: actions.filter((action) => action === "restore").length,
    errors: parsed.errors.slice(0, MAX_RETURNED_ERRORS),
    errorsTruncated: parsed.errors.length > MAX_RETURNED_ERRORS,
    sample: parsed.products.slice(0, MAX_SAMPLE_ROWS).map((product, index) => ({
      row: product.row,
      sku: product.sku,
      name: product.name,
      defaultUnit: product.default_unit,
      packSize: product.pack_size,
      packUnit: product.pack_unit,
      action: actions[index],
    })),
    canImport: parsed.errors.length === 0 && parsed.products.length > 0,
  };
}

export async function importProducts(db: SupabaseClient, file: File): Promise<ProductImportResult> {
  const parsed = await parseCatalogueFile(file);
  if (parsed.errors.length > 0) {
    throw new Error(`The spreadsheet contains ${parsed.invalidRows} invalid row(s). Preview it again and fix the errors.`);
  }
  if (parsed.products.length === 0) throw new Error("The spreadsheet has no products to import.");

  const existing = await findProductsBySku(db, parsed.products.map((product) => product.sku));
  const actions = parsed.products.map((product) => actionFor(product, existing));
  const productRows = parsed.products.map((product) => ({
    sku: product.sku,
    name: product.name,
    default_unit: product.default_unit,
    pack_size: product.pack_size,
    pack_unit: product.pack_unit,
    deleted_at: null,
  }));
  const { error } = await db.from("products").upsert(productRows, { onConflict: "sku" });
  if (error) throw new Error(error.message);

  return {
    ok: true,
    imported: productRows.length,
    created: actions.filter((action) => action === "create").length,
    updated: actions.filter((action) => action === "update").length,
    restored: actions.filter((action) => action === "restore").length,
  };
}
