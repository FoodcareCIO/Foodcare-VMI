export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export type SortDir = "asc" | "desc";

export type SortColumnDef = {
  key: string;
  column: string;
  foreignTable?: string;
};

export type SortInput = {
  key: string;
  column: string;
  ascending: boolean;
  foreignTable?: string;
};

export type PaginationInput = {
  page: number;
  limit: number;
  offset: number;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedRowsResponse = PaginationMeta & {
  rows: Record<string, unknown>[];
};

export type PaginatedOrdersResponse = PaginationMeta & {
  orders: Record<string, unknown>[];
};

export type PaginatedDevicesResponse = PaginationMeta & {
  devices: Record<string, unknown>[];
};

export type PaginatedCustomersResponse = PaginationMeta & {
  customers: { id: string; name: string; assigned: boolean }[];
};

export function parsePagination(
  request: Request,
  options?: {
    pageKey?: string;
    limitKey?: string;
    defaultPage?: number;
    defaultLimit?: number;
    maxLimit?: number;
  },
): PaginationInput {
  const url = new URL(request.url);
  const pageKey = options?.pageKey ?? "page";
  const limitKey = options?.limitKey ?? "limit";
  const maxLimit = options?.maxLimit ?? MAX_LIMIT;
  const defaultPage = options?.defaultPage ?? DEFAULT_PAGE;
  const defaultLimit = options?.defaultLimit ?? DEFAULT_LIMIT;

  const rawPage = Number(url.searchParams.get(pageKey) ?? defaultPage);
  const rawLimit = Number(url.searchParams.get(limitKey) ?? defaultLimit);

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : defaultPage;
  const limit = Number.isFinite(rawLimit) && rawLimit >= 1
    ? Math.min(Math.floor(rawLimit), maxLimit)
    : defaultLimit;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

export function paginatedMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return { page, limit, total, totalPages };
}

export function paginationRange(pagination: PaginationInput): { from: number; to: number } {
  return {
    from: pagination.offset,
    to: pagination.offset + pagination.limit - 1,
  };
}

export function buildApiPath(
  basePath: string,
  params: Record<string, string | number | undefined | null>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function parseSearch(
  request: Request,
  options?: { key?: string },
): string | undefined {
  const url = new URL(request.url);
  const key = options?.key ?? "q";
  const raw = url.searchParams.get(key)?.trim();
  return raw || undefined;
}

export function parseSort(
  request: Request,
  options: {
    sortKey?: string;
    dirKey?: string;
    columns: SortColumnDef[];
    defaultColumn: string;
    defaultAscending?: boolean;
  },
): SortInput {
  const url = new URL(request.url);
  const sortKey = options.sortKey ?? "sort";
  const dirKey = options.dirKey ?? "dir";
  const defaultAscending = options.defaultAscending ?? true;
  const allowed = new Map(options.columns.map((column) => [column.key, column]));
  const fallback =
    allowed.get(options.defaultColumn) ?? options.columns[0];

  const rawSort = url.searchParams.get(sortKey) ?? options.defaultColumn;
  const rawDir = url.searchParams.get(dirKey);
  const columnDef = allowed.get(rawSort) ?? fallback;
  const ascending =
    rawDir === "desc" ? false : rawDir === "asc" ? true : defaultAscending;

  return {
    key: columnDef.key,
    column: columnDef.column,
    ascending,
    foreignTable: columnDef.foreignTable,
  };
}
