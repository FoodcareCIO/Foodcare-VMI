const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Execute the real search builder with an in-memory database; no credentials or network.
function load(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => (name.startsWith('@/') ? load(`${name.slice(2)}.ts`) : require(name));
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(
    localRequire, module, module.exports,
  );
  return module.exports;
}

const { buildSearchFilter } = load('lib/search.ts');
const { orderSearch } = load('lib/search-config.ts');

/** Tables of rows; supports the two query shapes the search builder uses. */
function fakeDb(tables) {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        select() {
          return {
            or(filter) {
              calls.push({ table, or: filter });
              const term = /ilike\."%(.*?)%"/.exec(filter)[1].toLowerCase();
              const columns = [...filter.matchAll(/(\w+)\.ilike/g)].map((m) => m[1]);
              const rows = (tables[table] ?? []).filter((row) =>
                columns.some((column) => String(row[column] ?? '').toLowerCase().includes(term)),
              );
              return Promise.resolve({ data: rows.map(({ id }) => ({ id })) });
            },
            in(column, ids) {
              calls.push({ table, in: [column, ids] });
              const rows = (tables[table] ?? []).filter((row) => ids.includes(row[column]));
              return Promise.resolve({ data: rows.map(({ id }) => ({ id })) });
            },
          };
        },
      };
    },
  };
}

const db = () =>
  fakeDb({
    customer_sites: [
      { id: 'site-kitchen', name: 'Kitchen Food Co.' },
      { id: 'site-fuel', name: 'Fast Fuel Meals' },
    ],
    users: [
      { id: 'user-jacob', display_name: 'Jacob', email: 'jacob@foodcare.com.au' },
      { id: 'user-caleb', display_name: 'Caleb Williams', email: 'caleb@foodcare.com.au' },
    ],
    sales_reps: [
      { id: 'rep-jacob', user_id: 'user-jacob' },
      { id: 'rep-caleb', user_id: 'user-caleb' },
    ],
  });

test('order search never text-matches the status enum (Postgres rejects ILIKE on enums)', async () => {
  const filter = await buildSearchFilter(db(), 'sub', orderSearch);
  assert.doesNotMatch(filter, /status\.ilike/);
});

test('order search matches the status by the words shown in the table', async () => {
  assert.match(await buildSearchFilter(db(), 'submitted', orderSearch), /status\.in\.\(completed\)/);
  assert.match(await buildSearchFilter(db(), 'progress', orderSearch), /status\.in\.\(draft\)/);
  assert.match(await buildSearchFilter(db(), 'REJECT', orderSearch), /status\.in\.\(rejected\)/);
});

test('order search finds orders by site name', async () => {
  const filter = await buildSearchFilter(db(), 'kitchen', orderSearch);
  assert.match(filter, /site_id\.in\.\(site-kitchen\)/);
});

test('order search finds orders by the sales rep name, through the sales_reps table', async () => {
  const database = db();
  const filter = await buildSearchFilter(database, 'caleb', orderSearch);
  assert.match(filter, /sales_rep_id\.in\.\(rep-caleb\)/);
  assert.deepEqual(
    database.calls.find((call) => call.table === 'sales_reps'),
    { table: 'sales_reps', in: ['user_id', ['user-caleb']] },
  );
});

test('a search that matches nothing returns no rows instead of every row', async () => {
  const filter = await buildSearchFilter(db(), '2123', orderSearch);
  assert.equal(filter, 'id.is.null');
});

test('an empty search applies no filter', async () => {
  assert.equal(await buildSearchFilter(db(), '   ', orderSearch), undefined);
});

test('special characters in the search are escaped for ILIKE', async () => {
  const filter = await buildSearchFilter(db(), '50%_off,', { columns: ['name'] });
  assert.equal(filter, 'name.ilike."%50\\%\\_off\\,%"');
});
