export interface FormState {
  ok?: boolean;
  error?: string;
  message?: string;
}

export const emptyFormState: FormState = {};

export function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function optionalStr(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value.length > 0 ? value : null;
}

export function num(formData: FormData, key: string): number | null {
  const value = str(formData, key);
  if (value.length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function bool(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

export function fail(error: string): FormState {
  return { ok: false, error };
}

export function ok(message?: string): FormState {
  return { ok: true, message };
}
