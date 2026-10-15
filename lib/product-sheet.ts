// Spreadsheet helpers shared by the catalogue import and the site product list
// upload. Pure functions only, so they can be tested without a database.
import type { CellValue, SheetData } from "read-excel-file/node";

import type { ProductImportError } from "@/lib/product-import-types";

export const PRODUCT_IMPORT_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const PRODUCT_IMPORT_MAX_ROWS = 5000;
export const MAX_RETURNED_ERRORS = 100;

export type ProductColumn =
  | "sku"
  | "name"
  | "default_unit"
  | "pack_size"
  | "pack_unit"
  | "minimum_quantity";

export const HEADER_ALIASES: Record<string, ProductColumn> = {
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

export const normalizeText = (value: unknown): string =>
  String(value ?? "")
    .replace(/^﻿/, "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

export const normalizeMatch = (value: unknown): string =>
  normalizeText(value).replace(/[^a-z0-9]+/g, " ").trim();

export const skuKey = (sku: string): string => sku.trim().toLocaleLowerCase("en-US");

export const displayField = (field: ProductColumn): string =>
  ({
    sku: "Product code",
    name: "Product name",
    default_unit: "Default unit",
    pack_size: "Pack size",
    pack_unit: "Pack unit",
    minimum_quantity: "Minimum stock",
  })[field];

export function parseCsv(text: string): SheetData {
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

export const cellText = (value: CellValue | null | undefined): string => {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
};

export const isEmptyRow = (row: SheetData[number]): boolean =>
  row.every((cell) => cellText(cell) === "");

export function parseMinimum(value: string) {
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

export function inferUnit(description: string): string {
  const text = description.toLocaleLowerCase("en-US");
  if (/\b(ctn|cartons?)\b/.test(text)) return "ctn";
  if (/\b(box|boxes)\b/.test(text)) return "box";
  if (/\b(each)\b/.test(text)) return "each";
  if (/\b(pairs?)\b/.test(text)) return "pair";
  if (/\b(rolls?)\b/.test(text)) return "roll";
  if (/\b(pack|packs|pk)\s*\d*/.test(text)) return "pack";
  return "ea";
}

export function parsePackSize(value: string): { value: number | null; error: string | null } {
  if (!value) return { value: null, error: null };
  const parsed = Number(value.replace(/,/g, ""));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return { value: null, error: "Pack size must be a number greater than zero." };
  }
  return { value: parsed, error: null };
}

export interface SheetHeader {
  /** Zero-based index of the header row in the sheet. */
  index: number;
  /** Spreadsheet row number of the header (1-based). */
  row: number;
  columns: Map<ProductColumn, number>;
  errors: ProductImportError[];
}

/** Drops trailing blank rows and finds the header row with a code and a name column. */
export function findHeader(rows: SheetData): SheetHeader {
  while (rows.length && isEmptyRow(rows[rows.length - 1])) rows.pop();
  if (rows.length === 0) throw new Error("The spreadsheet is empty.");

  let index = -1;
  for (let candidate = 0; candidate < Math.min(rows.length, 30); candidate += 1) {
    const fields = new Set(
      rows[candidate].map((cell) => HEADER_ALIASES[normalizeText(cell)]).filter(Boolean),
    );
    if (fields.has("sku") && fields.has("name")) {
      index = candidate;
      break;
    }
  }
  if (index < 0) {
    throw new Error("Could not find a header row containing Product code/Code and Product name/Item Description.");
  }
  if (rows.length - index - 1 > PRODUCT_IMPORT_MAX_ROWS) {
    throw new Error(`The spreadsheet exceeds the ${PRODUCT_IMPORT_MAX_ROWS.toLocaleString()} row limit.`);
  }

  const row = index + 1;
  const columns = new Map<ProductColumn, number>();
  const errors: ProductImportError[] = [];
  rows[index].forEach((cell, column) => {
    const field = HEADER_ALIASES[normalizeText(cell)];
    if (!field) return;
    if (columns.has(field)) {
      errors.push({ row, field, message: `${displayField(field)} appears more than once.` });
    } else {
      columns.set(field, column);
    }
  });
  return { index, row, columns, errors };
}

export function requireColumns(header: SheetHeader, required: ProductColumn[]) {
  for (const field of required) {
    if (!header.columns.has(field)) {
      header.errors.push({ row: header.row, field, message: `Missing required column: ${displayField(field)}.` });
    }
  }
}

export const columnReader = (header: SheetHeader, row: SheetData[number]) =>
  (field: ProductColumn): string => {
    const column = header.columns.get(field);
    return column === undefined ? "" : cellText(row[column]);
  };

/** Adds an error to every row that repeats a product code (case-insensitive). */
export function flagDuplicateCodes(
  products: { row: number; sku: string }[],
  errors: ProductImportError[],
  invalidRows: Set<number>,
) {
  const skuRows = new Map<string, number[]>();
  for (const product of products) {
    if (!product.sku) continue;
    const key = skuKey(product.sku);
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
}
