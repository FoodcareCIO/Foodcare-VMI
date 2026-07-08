import type { SupabaseClient } from "@supabase/supabase-js";

export function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_,]/g, (char) => `\\${char}`);
}

export type SearchRelation = {
  table: string;
  fkColumn: string;
  columns: readonly string[];
};

export type SearchConfig = {
  columns: readonly string[];
  relations?: readonly SearchRelation[];
};

// PostgREST cannot mix local and embedded columns in a single `.or()`.
// Instead we resolve each related table to a list of matching foreign-key
// ids, then build one `.or()` string that only references local columns.
// Returns the filter string to pass to `query.or(...)`, or `undefined` when
// there is nothing to search for.
export async function buildSearchFilter(
  db: SupabaseClient,
  search: string | undefined,
  config: SearchConfig,
): Promise<string | undefined> {
  const term = search?.trim();
  if (!term) return undefined;

  const pattern = `%${escapeIlikePattern(term)}%`;
  const orParts: string[] = config.columns.map(
    (column) => `${column}.ilike."${pattern}"`,
  );

  for (const relation of config.relations ?? []) {
    const relFilter = relation.columns
      .map((column) => `${column}.ilike."${pattern}"`)
      .join(",");
    const { data } = await db.from(relation.table).select("id").or(relFilter);
    const ids = (data ?? []).map((row) => (row as { id: string }).id);
    if (ids.length > 0) {
      orParts.push(`${relation.fkColumn}.in.(${ids.join(",")})`);
    }
  }

  if (orParts.length === 0) return undefined;
  return orParts.join(",");
}
