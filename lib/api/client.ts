import { notify } from "@/lib/notifications";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export type ApiRequestOptions = {
  /** When true, failed requests do not show a toast notification. */
  silent?: boolean;
};

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return {};
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: ApiRequestOptions,
): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload = await parseBody(response);
  if (!response.ok) {
    const record =
      typeof payload === "object" && payload ? (payload as Record<string, unknown>) : {};
    const message =
      typeof record.error === "string" ? record.error : "Something went wrong. Please try again.";

    if (!options?.silent) {
      notify.error(message);
    }

    throw new ApiError(response.status, message);
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: ApiRequestOptions) =>
    request<T>("GET", path, undefined, options),
  post: <T>(path: string, body: unknown, options?: ApiRequestOptions) =>
    request<T>("POST", path, body, options),
  put: <T>(path: string, body: unknown, options?: ApiRequestOptions) =>
    request<T>("PUT", path, body, options),
  patch: <T>(path: string, body: unknown, options?: ApiRequestOptions) =>
    request<T>("PATCH", path, body, options),
  delete: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
    request<T>("DELETE", path, body, options),
};
