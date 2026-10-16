import type { SearchConfig } from "@/lib/search";

export const customerSearch: SearchConfig = {
  columns: ["name", "account_code"],
};

export const siteSearch: SearchConfig = {
  columns: ["name", "address"],
};

export const contactSearch: SearchConfig = {
  columns: ["name", "phone", "email"],
  relations: [
    { table: "customer_sites", fkColumn: "site_id", columns: ["name"] },
  ],
};

export const instructionSearch: SearchConfig = {
  columns: ["title", "instruction", "category"],
};

export const productSearch: SearchConfig = {
  columns: ["sku", "name", "default_unit", "pack_unit"],
};

export const siteProductSearch: SearchConfig = {
  columns: ["notes", "unit_of_measure"],
  relations: [
    { table: "products", fkColumn: "product_id", columns: ["sku", "name"] },
  ],
};

export const repSearch: SearchConfig = {
  columns: ["employee_code"],
  relations: [
    { table: "users", fkColumn: "user_id", columns: ["display_name", "email"] },
  ],
};

export const adminSearch: SearchConfig = {
  columns: ["role"],
  relations: [
    { table: "users", fkColumn: "user_id", columns: ["display_name", "email"] },
  ],
};

// `status` is a Postgres enum, so it is matched by the words shown in the
// Orders table (see statusLabels in components/ui/layout.tsx), never with ILIKE.
export const orderSearch: SearchConfig = {
  columns: [],
  labels: [
    {
      column: "status",
      labels: { draft: "In progress", completed: "Submitted", rejected: "Rejected" },
    },
  ],
  relations: [
    { table: "customer_sites", fkColumn: "site_id", columns: ["name"] },
    {
      table: "users",
      columns: ["display_name", "email"],
      via: { table: "sales_reps", column: "user_id" },
      fkColumn: "sales_rep_id",
    },
  ],
};

export const assignmentSearch: SearchConfig = {
  columns: ["name", "address"],
};
