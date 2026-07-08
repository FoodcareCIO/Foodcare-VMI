import type { FieldDef } from "@/components/entity-manager";

/** Convert EntityManager form fields to a JSON body for REST mutations. */
export function formFieldsToJson(
  formData: FormData,
  fields: FieldDef[],
  mode: "create" | "edit",
): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  for (const field of fields) {
    if (mode === "edit" && field.createOnly) continue;

    const raw = formData.get(field.name);
    const type = field.type ?? "text";

    if (type === "checkbox") {
      body[field.name] = raw === "on" || raw === "true" || raw === "1";
      continue;
    }

    if (raw === null || raw === undefined) {
      body[field.name] = null;
      continue;
    }

    const value = String(raw).trim();
    if (type === "number") {
      body[field.name] = value.length === 0 ? null : Number(value);
    } else {
      body[field.name] = value.length === 0 ? null : value;
    }
  }

  return body;
}
