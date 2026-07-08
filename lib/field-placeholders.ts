type PlaceholderField = {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
};

const PLACEHOLDERS_BY_NAME: Record<string, string> = {
  email: "name@company.com",
  password: "At least 8 characters",
  phone: "e.g. 555-123-4567",
  address: "Street address, city, postcode",
  account_code: "e.g. ACME001",
  sku: "e.g. SKU-12345",
  employee_code: "e.g. EMP001",
  sort_order: "0",
  image_url: "https://example.com/image.jpg",
  minimum_quantity: "e.g. 10",
  order_multiple: "e.g. 1",
  pack_size: "e.g. 12",
  default_unit: "e.g. case, each, kg",
  pack_unit: "e.g. bottle, box",
  unit_of_measure: "e.g. case",
  notes: "Optional notes",
  instruction: "Enter the instruction reps should follow at this site...",
  title: "e.g. Delivery entrance",
  product_id: "Select a product",
  site_id: "Select a site (optional)",
  role: "Select a role",
  category: "Select a category",
};

function fieldLabelPhrase(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*/g, "").trim().toLowerCase();
}

export function resolveFieldPlaceholder(field: PlaceholderField): string | undefined {
  if (field.placeholder) return field.placeholder;
  if (field.type === "checkbox") return undefined;

  if (PLACEHOLDERS_BY_NAME[field.name]) {
    return PLACEHOLDERS_BY_NAME[field.name];
  }

  const label = fieldLabelPhrase(field.label);

  switch (field.type) {
    case "email":
      return "name@company.com";
    case "password":
      return "At least 8 characters";
    case "number":
      return "e.g. 0";
    case "textarea":
      return `Enter ${label}...`;
    case "select":
      return `Select ${label}`;
    default:
      return `Enter ${label}`;
  }
}
