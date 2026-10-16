import type { SupabaseClient } from "@supabase/supabase-js";

export function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_,]/g, (char) => `\\${char}`);
}

export type SearchRelation = {
  /** Table whose text columns are searched. */
  table: string;
  /** Column on the searched (main) table that points at the matches. */
  fkColumn: string;
  columns: readonly string[];
  /**
   * Set when the main table reaches `table` through a middle table, e.g.
   * stock_counts.sales_rep_id -> sales_reps.user_id -> users.
   * `column` is the middle table's link to `table`.
   */
  via?: { table: string; column: string };
};

/**
 * A column that cannot be text-searched directly (such as a Postgres enum),
 * matched instead by the words the dashboard shows for each value.
 */
export type SearchLabels = {
  column: string;
  labels: Readonly<Record<string, string>>;
};

export type SearchConfig = {
  /** Plain text columns, matched with ILIKE. Never list enum columns here. */
  columns: readonly string[];
  relations?: readonly SearchRelation[];
  labels?: readonly SearchLabels[];
};

async function matchingIds(
  db: SupabaseClient,
  table: string,
  filter: { or: string } | { in: [column: string, ids: string[]] },
): Promise<string[]> {
  let query = db.from(table).select("id");
  query = "or" in filter ? query.or(filter.or) : query.in(filter.in[0], filter.in[1]);
  const { data } = await query;
  return (data ?? []).map((row) => (row as { id: string }).id);
}

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

  const lowerTerm = term.toLowerCase();
  for (const { column, labels } of config.labels ?? []) {
    const values = Object.entries(labels)
      .filter(
        ([value, label]) =>
          label.toLowerCase().includes(lowerTerm) || value.toLowerCase().includes(lowerTerm),
      )
      .map(([value]) => value);
    if (values.length > 0) orParts.push(`${column}.in.(${values.join(",")})`);
  }

  for (const relation of config.relations ?? []) {
    const relFilter = relation.columns
      .map((column) => `${column}.ilike."${pattern}"`)
      .join(",");
    let ids = await matchingIds(db, relation.table, { or: relFilter });
    if (relation.via && ids.length > 0) {
      ids = await matchingIds(db, relation.via.table, { in: [relation.via.column, ids] });
    }
    if (ids.length > 0) {
      orParts.push(`${relation.fkColumn}.in.(${ids.join(",")})`);
    }
  }

  // Nothing can match: return a filter that finds no rows rather than every row.
  if (orParts.length === 0) return "id.is.null";
  return orParts.join(",");
}
