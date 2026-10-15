// Site product list upload: parse the file, resolve each row to the values the
// database will store, and compare with the site's current list. No database
// access here; lib/services/site-product-list.ts supplies the data.
import type { SheetData } from "read-excel-file/node";

import {
  MAX_RETURNED_ERRORS,
  cellText,
  columnReader,
  findHeader,
  flagDuplicateCodes,
  inferUnit,
  isEmptyRow,
  normalizeMatch,
  parseMinimum,
  parsePackSize,
  requireColumns,
  skuKey,
} from "@/lib/product-sheet";
import type {
  ProductImportError,
  SiteProductListField,
  SiteProductListFieldChange,
  SiteProductListPreview,
  SiteProductListRename,
  SiteProductListRow,
  SiteProductListUpdate,
} from "@/lib/product-import-types";

/** More than this share of the current list removed needs a second confirmation. */
export const LARGE_REMOVAL_SHARE = 0.5;

export interface ParsedSiteRow {
  row: number;
  sku: string;
  name: string;
  unit: string | null;
  pack_size: number | null;
  pack_unit: string | null;
  minimum_quantity: number;
  minimum_unit: string | null;
  minimum_notes: string | null;
}

export interface ParsedSiteSheet {
  siteName: string | null;
  hasPackSize: boolean;
  hasPackUnit: boolean;
  totalRows: number;
  rows: ParsedSiteRow[];
  errors: ProductImportError[];
  invalidRows: number;
}

export interface CatalogueProduct {
  id: string;
  sku: string;
  name: string;
  default_unit: string;
  pack_size: number | null;
  pack_unit: string | null;
}

/** Values kept from this site's existing row (active or removed) for the same product. */
export interface SiteRowDefaults {
  unit_of_measure: string;
  order_multiple: number | null;
  notes: string | null;
}

export function parseSiteProductSheet(sheet: SheetData): ParsedSiteSheet {
  const header = findHeader(sheet);
  requireColumns(header, ["sku", "name", "minimum_quantity"]);
  const errors = [...header.errors];
  const invalidRows = new Set(errors.map((error) => error.row));

  let siteName: string | null = null;
  for (const row of sheet.slice(0, header.index)) {
    if (normalizeMatch(cellText(row[0])) === "name" && cellText(row[1])) siteName = cellText(row[1]);
  }

  const candidates: ParsedSiteRow[] = [];
  if (errors.length === 0) {
    for (let index = header.index + 1; index < sheet.length; index += 1) {
      const row = sheet[index];
      if (isEmptyRow(row)) continue;
      const spreadsheetRow = index + 1;
      const get = columnReader(header, row);
      const sku = get("sku");
      const name = get("name");
      const minimumText = get("minimum_quantity");
      // VMI workbooks have section heading rows with only a description.
      if (!sku && !minimumText) continue;

      const rowError = (field: string, message: string) => {
        errors.push({ row: spreadsheetRow, field, message });
        invalidRows.add(spreadsheetRow);
      };
      if (!sku) rowError("sku", "Product code is required.");
      if (!name) rowError("name", "Product name is required.");
      const minimum = parseMinimum(minimumText);
      if (minimum.error) rowError("minimum_quantity", minimum.error);
      const packSize = parsePackSize(get("pack_size"));
      if (packSize.error) rowError("pack_size", packSize.error);

      candidates.push({
        row: spreadsheetRow,
        sku,
        name,
        unit: get("default_unit") || null,
        pack_size: packSize.value,
        pack_unit: get("pack_unit") || null,
        minimum_quantity: minimum.quantity ?? 0,
        minimum_unit: minimum.unit,
        minimum_notes: minimum.notes,
      });
    }
    flagDuplicateCodes(candidates, errors, invalidRows);
    if (candidates.length === 0) {
      errors.push({ row: header.row, message: "The file has no product rows below the header." });
      invalidRows.add(header.row);
    }
  }

  errors.sort((left, right) => left.row - right.row);
  return {
    siteName,
    hasPackSize: header.columns.has("pack_size"),
    hasPackUnit: header.columns.has("pack_unit"),
    totalRows: candidates.length,
    rows: candidates.filter((row) => !invalidRows.has(row.row)),
    errors,
    invalidRows: invalidRows.size,
  };
}

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Fills in what the file does not say from the existing product and site row,
 * so re-uploading the same file resolves to exactly the stored values.
 */
export function resolveSiteProductRows(
  parsed: Pick<ParsedSiteSheet, "rows" | "hasPackSize" | "hasPackUnit">,
  products: Map<string, CatalogueProduct>,
  siteRows: Map<string, SiteRowDefaults>,
): SiteProductListRow[] {
  return parsed.rows.map((row) => {
    const key = skuKey(row.sku);
    const product = products.get(key);
    const siteRow = siteRows.get(key);
    const defaultUnit = row.unit || product?.default_unit || inferUnit(row.name);
    return {
      sku: row.sku,
      name: row.name,
      default_unit: defaultUnit,
      pack_size: parsed.hasPackSize ? row.pack_size : toNumber(product?.pack_size),
      pack_unit: parsed.hasPackUnit ? row.pack_unit : (product?.pack_unit ?? null),
      minimum_quantity: row.minimum_quantity,
      unit_of_measure: row.minimum_unit || row.unit || siteRow?.unit_of_measure || defaultUnit,
      order_multiple: toNumber(siteRow?.order_multiple) || 1,
      notes: row.minimum_notes || siteRow?.notes || null,
    };
  });
}

const FIELD_LABELS: Record<SiteProductListField, string> = {
  name: "Name",
  minimum_quantity: "Minimum",
  unit_of_measure: "Unit",
  default_unit: "Product unit",
  pack_size: "Pack size",
  pack_unit: "Pack unit",
  order_multiple: "Order multiple",
  notes: "Notes",
};
const NUMERIC_FIELDS = new Set<SiteProductListField>(["minimum_quantity", "pack_size", "order_multiple"]);

// Mirrors how replace_site_product_list stores values (trimmed text, '' as
// null, order multiple defaulting to 1) so the preview matches the result.
const comparable = (field: SiteProductListField, value: unknown): string | number | null => {
  if (NUMERIC_FIELDS.has(field)) {
    return toNumber(value) ?? (field === "order_multiple" ? 1 : null);
  }
  const text = String(value ?? "").trim();
  return text || null;
};

const byName = (left: { name: string; sku: string }, right: { name: string; sku: string }) =>
  left.name.toLocaleLowerCase("en-US").localeCompare(right.name.toLocaleLowerCase("en-US")) ||
  left.sku.localeCompare(right.sku);

export interface SiteProductListDiff {
  added: SiteProductListRow[];
  updated: SiteProductListUpdate[];
  removed: SiteProductListRow[];
  unchanged: number;
}

export function diffSiteProductList(
  current: SiteProductListRow[],
  next: SiteProductListRow[],
): SiteProductListDiff {
  const currentByKey = new Map(current.map((row) => [skuKey(row.sku), row]));
  const nextKeys = new Set(next.map((row) => skuKey(row.sku)));
  const added: SiteProductListRow[] = [];
  const updated: SiteProductListUpdate[] = [];
  let unchanged = 0;

  for (const row of next) {
    const before = currentByKey.get(skuKey(row.sku));
    if (!before) {
      added.push(row);
      continue;
    }
    const changes: SiteProductListFieldChange[] = [];
    for (const field of Object.keys(FIELD_LABELS) as SiteProductListField[]) {
      const previous = comparable(field, before[field]);
      const value = comparable(field, row[field]);
      if (previous !== value) {
        changes.push({ field, label: FIELD_LABELS[field], before: previous, after: value });
      }
    }
    if (changes.length > 0) updated.push({ sku: row.sku, name: row.name, changes });
    else unchanged += 1;
  }

  return {
    added: added.sort(byName),
    updated: updated.sort(byName),
    removed: current.filter((row) => !nextKeys.has(skuKey(row.sku))).sort(byName),
    unchanged,
  };
}

/** Products in the file whose shared catalogue name would change. */
export function findRenamedProducts(rows: SiteProductListRow[], products: Map<string, CatalogueProduct>) {
  return rows.flatMap((row) => {
    const product = products.get(skuKey(row.sku));
    if (!product || product.name.trim() === row.name.trim()) return [];
    return [{ productId: product.id, sku: row.sku, oldName: product.name, newName: row.name }];
  });
}

export const siteNameMatches = (fileSiteName: string | null, siteName: string): boolean =>
  !fileSiteName || normalizeMatch(fileSiteName) === normalizeMatch(siteName);

export const isLargeRemoval = (removed: number, currentCount: number): boolean =>
  currentCount > 0 && removed / currentCount > LARGE_REMOVAL_SHARE;

export function buildSiteListPreview(input: {
  site: { id: string; name: string; version: number };
  fileName: string;
  parsed: ParsedSiteSheet;
  rows: SiteProductListRow[];
  current: SiteProductListRow[];
  renamedShared: SiteProductListRename[];
}): SiteProductListPreview {
  const { site, parsed, rows, current } = input;
  const canReplace = parsed.errors.length === 0 && rows.length > 0;
  // A diff of a partly invalid file would show its bad rows as removals.
  const diff = canReplace
    ? diffSiteProductList(current, rows)
    : { added: [], updated: [], removed: [], unchanged: 0 };
  return {
    siteId: site.id,
    siteName: site.name,
    fileName: input.fileName,
    fileSiteName: parsed.siteName,
    expectedVersion: site.version,
    totalRows: parsed.totalRows,
    validRows: rows.length,
    invalidRows: parsed.invalidRows,
    errors: parsed.errors.slice(0, MAX_RETURNED_ERRORS),
    errorsTruncated: parsed.errors.length > MAX_RETURNED_ERRORS,
    currentCount: current.length,
    added: diff.added,
    updated: diff.updated,
    removed: diff.removed,
    unchangedCount: diff.unchanged,
    siteNameMismatch: !siteNameMatches(parsed.siteName, site.name),
    largeRemoval: canReplace && isLargeRemoval(diff.removed.length, current.length),
    renamedShared: canReplace ? input.renamedShared : [],
    noChanges: canReplace && diff.added.length + diff.updated.length + diff.removed.length === 0,
    canReplace,
  };
}

/** Server-side re-check of what the preview asked the user to confirm. */
export function assertReplaceAllowed(
  preview: SiteProductListPreview,
  confirmed: { siteMismatch: boolean; largeRemoval: boolean },
) {
  if (!preview.canReplace) {
    const first = preview.errors[0];
    throw new Error(
      `${first ? `Row ${first.row}: ${first.message} ` : ""}Fix the file and preview it again. The site list was not changed.`,
    );
  }
  if (preview.siteNameMismatch && !confirmed.siteMismatch) {
    throw new Error(
      `This file says "${preview.fileSiteName}" but you are uploading to "${preview.siteName}". Tick the box to confirm.`,
    );
  }
  if (preview.largeRemoval && !confirmed.largeRemoval) {
    throw new Error(
      `This file removes ${preview.removed.length} of ${preview.currentCount} products from this site. Tick the box to confirm.`,
    );
  }
}
