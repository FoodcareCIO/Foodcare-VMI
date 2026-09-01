export type ProductImportAction = "create" | "update" | "restore";
export type ProductImportFormat = "catalog" | "vmi";

export interface ProductImportSite {
  id: string;
  customerName: string;
  siteName: string;
  address: string;
}

export interface ProductImportError {
  row: number;
  field?: string;
  message: string;
}

export interface ProductImportSampleRow {
  row: number;
  sku: string;
  name: string;
  defaultUnit: string;
  packSize: number | null;
  packUnit: string | null;
  minimumQuantity: number | null;
  minimumUnit: string | null;
  action: ProductImportAction;
}

export interface ProductImportPreview {
  format: ProductImportFormat;
  site: ProductImportSite | null;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createCount: number;
  updateCount: number;
  restoreCount: number;
  minimumCreateCount: number;
  minimumUpdateCount: number;
  minimumRestoreCount: number;
  errors: ProductImportError[];
  errorsTruncated: boolean;
  sample: ProductImportSampleRow[];
  canImport: boolean;
}

export interface ProductImportResult {
  ok: true;
  format: ProductImportFormat;
  site: ProductImportSite | null;
  imported: number;
  created: number;
  updated: number;
  restored: number;
  minimumsImported: number;
  minimumsCreated: number;
  minimumsUpdated: number;
  minimumsRestored: number;
}
