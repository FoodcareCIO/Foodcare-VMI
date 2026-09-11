const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Execute the real service with an in-memory database; no credentials or network.
function load(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => {
    if (name === '@/lib/api/server') return { nowIso: () => new Date().toISOString() };
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(
    localRequire, module, module.exports,
  );
  return module.exports;
}

const { listProducts, listCustomers } = load('lib/services/admin-data.ts');
const page = { page: 1, limit: 2, offset: 0 };
const sort = { key: 'name', column: 'name', ascending: true };

function database(failTable) {
  const tables = {
    products: [
      { id: 'p1', name: 'Apron', deleted_at: null },
      { id: 'p2', name: 'Boot', deleted_at: null },
      { id: 'p3', name: 'Cap', deleted_at: null },
    ],
    customers: [{ id: 'c1', name: 'Foodcare', deleted_at: null }],
    customer_sites: [
      { id: 's1', name: 'West', customer_id: 'c1', deleted_at: null },
      { id: 's2', name: 'East', customer_id: 'c1', deleted_at: null },
      { id: 's3', name: 'Closed', customer_id: 'c1', deleted_at: '2026-01-01' },
    ],
    site_products: [
      { product_id: 'p1', site_id: 's1', deleted_at: null },
      { product_id: 'p1', site_id: 's2', deleted_at: null },
      { product_id: 'p1', site_id: 's3', deleted_at: null },
      { product_id: 'p2', site_id: 's1', deleted_at: '2026-01-01' },
      { product_id: 'p3', site_id: 's2', deleted_at: null },
    ],
  };
  const calls = [];
  return {
    calls,
    from(table) {
      calls.push(table);
      let rows = [...tables[table]];
      let window;
      const query = {
        select() { return query; },
        is(key, value) { rows = rows.filter(row => row[key] === value); return query; },
        in(key, values) { rows = rows.filter(row => values.includes(row[key])); return query; },
        order(key) { rows.sort((a, b) => a[key].localeCompare(b[key])); return query; },
        range(from, to) { window = [from, to]; return query; },
        then(resolve, reject) {
          return Promise.resolve({
            data: window ? rows.slice(window[0], window[1] + 1) : rows,
            count: rows.length,
            error: table === failTable ? { message: 'Assignment lookup failed' } : null,
          }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

test('products include active sites and exclude deleted sites and assignments', async () => {
  const result = await listProducts(database(), page, sort);
  assert.deepEqual(result.rows[0].assigned_sites, ['Foodcare — East', 'Foodcare — West']);
  assert.deepEqual(result.rows[1].assigned_sites, []);
  assert.equal(result.total, 3);
  assert.equal(result.rows.length, 2);
});

test('assignments follow the requested product page', async () => {
  const result = await listProducts(database(), { page: 2, limit: 2, offset: 2 }, sort);
  assert.equal(result.rows[0].id, 'p3');
  assert.deepEqual(result.rows[0].assigned_sites, ['Foodcare — East']);
});

test('empty product pages do not query assignments', async () => {
  const db = database();
  const result = await listProducts(db, { page: 3, limit: 2, offset: 4 }, sort);
  assert.deepEqual(result.rows, []);
  assert.deepEqual(db.calls, ['products']);
});

test('customer lists do not run product assignment lookups', async () => {
  const db = database();
  const result = await listCustomers(db, page, sort);
  assert.equal(result.rows[0].id, 'c1');
  assert.equal('assigned_sites' in result.rows[0], false);
  assert.deepEqual(db.calls, ['customers']);
});

test('assignment lookup errors are not displayed as unassigned products', async () => {
  await assert.rejects(listProducts(database('site_products'), page, sort), /Assignment lookup failed/);
});
