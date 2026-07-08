// Database row shapes (snake_case) mirroring the Supabase Postgres schema in
// the foodcare-vmi-app repo (supabase/migrations). Only the columns the admin
// dashboard reads/writes are typed here.

export type StockCountStatus = "draft" | "completed" | "rejected";

export interface Customer {
  id: string;
  account_code: string | null;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export interface CustomerSite {
  id: string;
  customer_id: string;
  name: string;
  address: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export interface CustomerContact {
  id: string;
  customer_id: string;
  site_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export interface SiteInstruction {
  id: string;
  site_id: string;
  instruction: string;
  sort_order: number;
  sensitive: boolean;
  category: string;
  title: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  default_unit: string;
  pack_size: number | null;
  pack_unit: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export interface SiteProduct {
  id: string;
  site_id: string;
  product_id: string;
  minimum_quantity: number;
  unit_of_measure: string;
  order_multiple: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export interface AppUser {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export interface SalesRep {
  id: string;
  user_id: string;
  employee_code: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export interface SalesRepCustomerAssignment {
  id: string;
  sales_rep_id: string;
  customer_id: string;
  created_at: string;
  deleted_at: string | null;
}

export interface AdminUser {
  user_id: string;
  role: string;
  created_at: string;
  deleted_at: string | null;
}

export interface Device {
  id: string;
  user_id: string;
  platform: string | null;
  name: string | null;
  created_at: string;
  last_seen_at: string;
  revoked_at: string | null;
}

export interface StockCount {
  id: string;
  customer_id: string;
  site_id: string;
  sales_rep_id: string;
  device_id: string;
  status: StockCountStatus;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export interface StockCountItem {
  id: string;
  stock_count_id: string;
  product_id: string;
  product_sku_snapshot: string;
  product_name_snapshot: string;
  minimum_quantity_snapshot: number;
  unit_of_measure_snapshot: string;
  current_quantity: number;
  suggested_order_quantity: number;
  order_quantity: number;
  was_overridden: boolean;
  is_counted: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  version: number;
}

export interface StockCountExport {
  id: string;
  stock_count_id: string;
  file_name: string;
  storage_path: string | null;
  generated_status: "pending" | "generated" | "failed";
  email_status: "not_requested" | "pending" | "sent" | "failed";
  recipients: string[];
  generated_at: string | null;
  emailed_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  version: number;
}
