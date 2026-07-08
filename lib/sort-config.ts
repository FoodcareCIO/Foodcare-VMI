import type { SortColumnDef } from "@/lib/pagination";

export const customerSortColumns: SortColumnDef[] = [
  { key: "name", column: "name" },
  { key: "account_code", column: "account_code" },
];
export const CUSTOMER_DEFAULT_SORT = "name";

export const siteSortColumns: SortColumnDef[] = [
  { key: "name", column: "name" },
  { key: "address", column: "address" },
];
export const SITE_DEFAULT_SORT = "name";

export const contactSortColumns: SortColumnDef[] = [
  { key: "name", column: "name" },
  { key: "phone", column: "phone" },
  { key: "email", column: "email" },
  { key: "site_id", column: "site_id" },
  { key: "is_primary", column: "is_primary" },
];
export const CONTACT_DEFAULT_SORT = "name";

export const instructionSortColumns: SortColumnDef[] = [
  { key: "sort_order", column: "sort_order" },
  { key: "category", column: "category" },
  { key: "title", column: "title" },
  { key: "instruction", column: "instruction" },
  { key: "sensitive", column: "sensitive" },
];
export const INSTRUCTION_DEFAULT_SORT = "sort_order";

export const productSortColumns: SortColumnDef[] = [
  { key: "sku", column: "sku" },
  { key: "name", column: "name" },
  { key: "default_unit", column: "default_unit" },
  { key: "pack_size", column: "pack_size" },
  { key: "pack_unit", column: "pack_unit" },
];
export const PRODUCT_DEFAULT_SORT = "name";

export const siteProductSortColumns: SortColumnDef[] = [
  { key: "product_id", column: "product_id" },
  { key: "minimum_quantity", column: "minimum_quantity" },
  { key: "unit_of_measure", column: "unit_of_measure" },
  { key: "order_multiple", column: "order_multiple" },
  { key: "notes", column: "notes" },
  { key: "created_at", column: "created_at" },
];
export const SITE_PRODUCT_DEFAULT_SORT = "created_at";

export const repSortColumns: SortColumnDef[] = [
  { key: "display_name", column: "display_name", foreignTable: "users" },
  { key: "email", column: "email", foreignTable: "users" },
  { key: "employee_code", column: "employee_code" },
];
export const REP_DEFAULT_SORT = "display_name";

export const adminSortColumns: SortColumnDef[] = [
  { key: "display_name", column: "display_name", foreignTable: "users" },
  { key: "email", column: "email", foreignTable: "users" },
  { key: "role", column: "role" },
];
export const ADMIN_DEFAULT_SORT = "display_name";

export const orderSortColumns: SortColumnDef[] = [
  { key: "customer", column: "name", foreignTable: "customers" },
  { key: "site", column: "name", foreignTable: "customer_sites" },
  { key: "status", column: "status" },
  { key: "date", column: "started_at" },
  { key: "started_at", column: "started_at" },
  { key: "completed_at", column: "completed_at" },
];
export const ORDER_DEFAULT_SORT = "started_at";
export const ORDER_DEFAULT_DIR = "desc" as const;

export const deviceSortColumns: SortColumnDef[] = [
  { key: "name", column: "name" },
  { key: "platform", column: "platform" },
  { key: "rep", column: "display_name", foreignTable: "users" },
  { key: "last_seen_at", column: "last_seen_at" },
  { key: "status", column: "revoked_at" },
];
export const DEVICE_DEFAULT_SORT = "last_seen_at";
export const DEVICE_DEFAULT_DIR = "desc" as const;

export const assignmentSortColumns: SortColumnDef[] = [
  { key: "name", column: "name" },
];
export const ASSIGNMENT_DEFAULT_SORT = "name";
