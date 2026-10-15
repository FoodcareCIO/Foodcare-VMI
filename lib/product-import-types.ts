export type ProductImportAction = "create" | "update" | "restore";

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
  action: ProductImportAction;
}

export interface ProductImportPreview {
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createCount: number;
  updateCount: number;
  restoreCount: number;
  errors: ProductImportError[];
  errorsTruncated: boolean;
  sample: ProductImportSampleRow[];
  canImport: boolean;
}

export interface ProductImportResult {
  ok: true;
  imported: number;
  created: number;
  updated: number;
  restored: number;
}

/** One product on a site's list, in the shape the tablet uses. */
export interface SiteProductListRow {
  sku: string;
  name: string;
  default_unit: string;
  pack_size: number | null;
  pack_unit: string | null;
  minimum_quantity: number;
  unit_of_measure: string;
  order_multiple: number | null;
  notes: string | null;
}

export type SiteProductListField = Exclude<keyof SiteProductListRow, "sku">;

export interface SiteProductListFieldChange {
  field: SiteProductListField;
  label: string;
  before: string | number | null;
  after: string | number | null;
}

export interface SiteProductListUpdate {
  sku: string;
  name: string;
  changes: SiteProductListFieldChange[];
}

export interface SiteProductListRename {
  sku: string;
  oldName: string;
  newName: string;
  otherSites: number;
}

export interface SiteProductListPreview {
  siteId: string;
  siteName: string;
  fileName: string;
  /** The site "Name" written inside the workbook, if any. */
  fileSiteName: string | null;
  /** List version the preview was made against; sent back on replace. */
  expectedVersion: number;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ProductImportError[];
  errorsTruncated: boolean;
  currentCount: number;
  added: SiteProductListRow[];
  updated: SiteProductListUpdate[];
  removed: SiteProductListRow[];
  unchangedCount: number;
  siteNameMismatch: boolean;
  largeRemoval: boolean;
  renamedShared: SiteProductListRename[];
  noChanges: boolean;
  canReplace: boolean;
}

export interface SiteProductListResult {
  status: "applied" | "unchanged";
  upload_id: string | null;
  version: number;
  updated_at: string | null;
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
}

export interface SiteProductListUpload {
  id: string;
  kind: "upload" | "restore";
  file_name: string;
  uploaded_at: string;
  uploaded_by_name: string | null;
  version: number;
  added_count: number;
  updated_count: number;
  removed_count: number;
  unchanged_count: number;
  restored_from: string | null;
}

export interface SiteProductListInfo {
  site: {
    id: string;
    name: string;
    product_list_version: number;
    product_list_updated_at: string | null;
  };
  lastUpload: SiteProductListUpload | null;
  products: SiteProductListRow[];
}
