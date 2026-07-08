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

export const orderSearch: SearchConfig = {
  columns: ["status"],
  relations: [
    { table: "customers", fkColumn: "customer_id", columns: ["name"] },
    { table: "customer_sites", fkColumn: "site_id", columns: ["name"] },
  ],
};

export const deviceSearch: SearchConfig = {
  columns: ["name", "platform"],
  relations: [
    { table: "users", fkColumn: "user_id", columns: ["display_name", "email"] },
  ],
};

export const assignmentSearch: SearchConfig = {
  columns: ["name", "account_code"],
};
