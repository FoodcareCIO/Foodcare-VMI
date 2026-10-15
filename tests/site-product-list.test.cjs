const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Execute the real services with an in-memory database; no credentials or network.
const loaded = new Map();
function load(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  if (loaded.has(filename)) return loaded.get(filename).exports;
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
  }).outputText;
  const module = { exports: {} };
  loaded.set(filename, module);
  const localRequire = (name) => {
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(
    localRequire, module, module.exports,
  );
  return module.exports;
}

const {
  previewSiteProductList,
  replaceSiteProductList,
  getSiteProductList,
  restoreSiteProductList,
} = load('lib/services/site-product-list.ts');
const { previewProductImport } = load('lib/services/product-import.ts');
const { diffSiteProductList, isLargeRemoval } = load('lib/site-product-list.ts');

const SITE = '11111111-1111-4111-8111-111111111111';
const OTHER_SITE = '22222222-2222-4222-8222-222222222222';
const FIELDS = ['name', 'default_unit', 'pack_size', 'pack_unit', 'minimum_quantity', 'unit_of_measure', 'order_multiple', 'notes'];
const NUMERIC = new Set(['pack_size', 'minimum_quantity', 'order_multiple']);
const norm = (field, value) => {
  if (NUMERIC.has(field)) return value === null || value === undefined || value === '' ? (field === 'order_multiple' ? 1 : null) : Number(value);
  return String(value ?? '').trim() || null;
};

const csvFile = (lines, name = 'FastFuel.csv') => new File([lines.join('\r\n')], name, { type: 'text/csv' });

// A small stand-in for Supabase: table queries plus the list RPCs, following
// the SQL in supabase/migrations/202610150001_reliable_orders_and_site_lists.sql.
function database({ products = [], siteProducts = [] } = {}) {
  let nextId = 1;
  const tables = {
    customer_sites: [
      { id: SITE, name: 'Fast Fuel Meals', product_list_version: 0, product_list_updated_at: null, deleted_at: null },
      { id: OTHER_SITE, name: 'Bayside Cafe', product_list_version: 0, product_list_updated_at: null, deleted_at: null },
    ],
    products: products.map((product) => ({ pack_size: null, pack_unit: null, deleted_at: null, ...product })),
    site_products: siteProducts.map((row) => ({ order_multiple: 1, notes: null, deleted_at: null, ...row })),
    site_product_list_uploads: [],
    users: [{ id: 'u1', display_name: 'Jane' }],
  };
  const rpcCalls = [];
  const productById = (id) => tables.products.find((product) => product.id === id);
  const productBySku = (sku) => tables.products.find((product) => product.sku.toLowerCase() === sku.trim().toLowerCase());

  const listJson = (siteId) => tables.site_products
    .filter((row) => row.site_id === siteId && !row.deleted_at && !productById(row.product_id).deleted_at)
    .map((row) => {
      const product = productById(row.product_id);
      return {
        sku: product.sku, name: product.name, default_unit: product.default_unit,
        pack_size: product.pack_size, pack_unit: product.pack_unit,
        minimum_quantity: row.minimum_quantity, unit_of_measure: row.unit_of_measure,
        order_multiple: row.order_multiple, notes: row.notes,
      };
    })
    .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()) || a.sku.toLowerCase().localeCompare(b.sku.toLowerCase()));

  const failure = (message) => ({ data: null, error: { message } });

  function replace(params) {
    const site = tables.customer_sites.find((row) => row.id === params.p_site_id && !row.deleted_at);
    if (!site) return failure('Site not found.');
    if (params.p_expected_version !== null && site.product_list_version !== params.p_expected_version) {
      return failure('The site list changed since this file was previewed. Preview the file again.');
    }
    const keys = params.p_rows.map((row) => row.sku.trim().toLowerCase());
    if (new Set(keys).size !== keys.length) return failure('The file contains the same product code more than once.');
    const previous = listJson(site.id);
    let added = 0;
    let updated = 0;
    let unchanged = 0;
    for (const row of params.p_rows) {
      const product = productBySku(row.sku);
      const siteRow = product && tables.site_products.find((item) => item.site_id === site.id && item.product_id === product.id);
      if (!product || product.deleted_at || !siteRow || siteRow.deleted_at) added += 1;
      else if (FIELDS.some((field) => norm(field, { ...product, ...siteRow }[field]) !== norm(field, row[field]))) updated += 1;
      else unchanged += 1;
    }
    const removedRows = tables.site_products.filter((row) => row.site_id === site.id && !row.deleted_at
      && !productById(row.product_id).deleted_at && !keys.includes(productById(row.product_id).sku.toLowerCase()));
    if (added + updated + removedRows.length === 0) {
      return { data: { status: 'unchanged', upload_id: null, version: site.product_list_version, updated_at: site.product_list_updated_at, added: 0, updated: 0, removed: 0, unchanged }, error: null };
    }
    for (const row of params.p_rows) {
      let product = productBySku(row.sku);
      if (!product) {
        product = { id: `p-new-${nextId++}`, sku: row.sku };
        tables.products.push(product);
      }
      Object.assign(product, { name: row.name, default_unit: row.default_unit, pack_size: row.pack_size, pack_unit: row.pack_unit, deleted_at: null });
      let siteRow = tables.site_products.find((item) => item.site_id === site.id && item.product_id === product.id);
      if (!siteRow) {
        siteRow = { id: `sp-new-${nextId++}`, site_id: site.id, product_id: product.id };
        tables.site_products.push(siteRow);
      }
      Object.assign(siteRow, {
        minimum_quantity: row.minimum_quantity, unit_of_measure: row.unit_of_measure,
        order_multiple: row.order_multiple ?? 1, notes: row.notes, deleted_at: null,
      });
    }
    for (const row of removedRows) row.deleted_at = '2026-10-15T00:00:00Z';
    site.product_list_version += 1;
    site.product_list_updated_at = '2026-10-15T10:42:00Z';
    const upload = {
      id: `upload-${nextId++}`, site_id: site.id, kind: params.p_kind, file_name: params.p_file_name,
      uploaded_by: params.p_actor, uploaded_at: `2026-10-15T10:${String(40 + nextId).padStart(2, '0')}:00Z`,
      version: site.product_list_version, added_count: added, updated_count: updated,
      removed_count: removedRows.length, unchanged_count: unchanged, restored_from: params.p_restored_from,
      previous_list: previous, new_list: listJson(site.id),
    };
    tables.site_product_list_uploads.push(upload);
    return { data: { status: 'applied', upload_id: upload.id, version: site.product_list_version, updated_at: site.product_list_updated_at, added, updated, removed: removedRows.length, unchanged }, error: null };
  }

  const rpcs = {
    site_product_list_json: ({ p_site_id }) => ({ data: listJson(p_site_id), error: null }),
    replace_site_product_list: replace,
    restore_site_product_list: ({ p_upload_id, p_actor }) => {
      const upload = tables.site_product_list_uploads.find((row) => row.id === p_upload_id);
      if (!upload) return failure('This history entry no longer exists.');
      return replace({
        p_site_id: upload.site_id, p_rows: upload.previous_list, p_file_name: `Restore of ${upload.file_name}`,
        p_file_sha256: `restore:${upload.id}`, p_actor, p_expected_version: null, p_kind: 'restore', p_restored_from: upload.id,
      });
    },
  };

  const join = (table, columns, row) => {
    if (table === 'site_products' && columns.includes('products')) {
      const product = productById(row.product_id);
      return product ? { ...row, products: { sku: product.sku } } : null;
    }
    if (table === 'site_product_list_uploads' && columns.includes('users')) {
      const user = tables.users.find((item) => item.id === row.uploaded_by);
      return { ...row, users: user ? { display_name: user.display_name } : null };
    }
    return row;
  };

  return {
    tables,
    rpcCalls,
    listJson,
    rpc(name, params) {
      rpcCalls.push({ name, params });
      return Promise.resolve(rpcs[name](params));
    },
    from(table) {
      const filters = [];
      let columns = '';
      let sort;
      let limit;
      const run = () => {
        let rows = tables[table].filter((row) => filters.every((filter) => filter(row)));
        if (sort) rows = [...rows].sort((a, b) => String(a[sort.key]).localeCompare(String(b[sort.key])) * (sort.ascending ? 1 : -1));
        if (limit !== undefined) rows = rows.slice(0, limit);
        return { data: rows.map((row) => join(table, columns, row)).filter(Boolean), error: null };
      };
      const lower = (value) => String(value ?? '').toLowerCase();
      const query = {
        select(value) { columns = value ?? ''; return query; },
        eq(key, value) { filters.push((row) => row[key] === value); return query; },
        neq(key, value) { filters.push((row) => row[key] !== value); return query; },
        is(key, value) { filters.push((row) => (row[key] ?? null) === value); return query; },
        in(key, values) { filters.push((row) => values.map(lower).includes(lower(row[key]))); return query; },
        order(key, options) { sort = { key, ascending: options?.ascending !== false }; return query; },
        limit(value) { limit = value; return query; },
        maybeSingle() { const { data, error } = run(); return Promise.resolve({ data: data[0] ?? null, error }); },
        then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); },
      };
      return query;
    },
  };
}

const seedProducts = (count) => ({
  products: Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`, sku: `A${index + 1}`, name: `Product ${index + 1}`, default_unit: 'ea',
  })),
  siteProducts: Array.from({ length: count }, (_, index) => ({
    id: `sp${index + 1}`, site_id: SITE, product_id: `p${index + 1}`, minimum_quantity: 2, unit_of_measure: 'ea',
  })),
});

const replaceWith = (db, file, preview, confirmations = {}) => replaceSiteProductList(db, 'u1', SITE, file, {
  expectedVersion: preview.expectedVersion,
  confirmSiteMismatch: false,
  confirmLargeRemoval: false,
  ...confirmations,
});

test('uploading the same file twice changes nothing the second time', async () => {
  const db = database();
  const lines = [
    'Product code,Product name,Minimum stock',
    'GL-1,"Gloves, nitrile box",2 ctn',
    'AP-1,Apron each,5',
    'TW-1,Paper towel rolls,"1,000"',
  ];
  const first = await previewSiteProductList(db, SITE, csvFile(lines));
  assert.equal(first.added.length, 3);
  assert.equal(first.canReplace, true);
  const applied = await replaceWith(db, csvFile(lines), first);
  assert.equal(applied.status, 'applied');
  assert.deepEqual(db.listJson(SITE).map((row) => [row.sku, row.default_unit, row.unit_of_measure, row.minimum_quantity, row.notes]), [
    ['AP-1', 'each', 'each', 5, null],
    ['GL-1', 'box', 'ctn', 2, 'Sheet par: 2 ctn'],
    ['TW-1', 'roll', 'roll', 1000, null],
  ]);

  const second = await previewSiteProductList(db, SITE, csvFile(lines));
  assert.equal(second.noChanges, true);
  assert.deepEqual([second.added.length, second.updated.length, second.removed.length, second.unchangedCount], [0, 0, 0, 3]);
  assert.equal(second.expectedVersion, 1);
  const again = await replaceWith(db, csvFile(lines), second);
  assert.equal(again.status, 'unchanged');
  assert.equal(db.tables.site_product_list_uploads.length, 1);
  assert.equal(db.tables.products.length, 3);
});

test('products missing from the file are removed from this site only', async () => {
  const db = database(seedProducts(3));
  db.tables.site_products.push({ id: 'other', site_id: OTHER_SITE, product_id: 'p3', minimum_quantity: 1, unit_of_measure: 'ea', order_multiple: 1, notes: null, deleted_at: null });
  const lines = ['Code,Item Description,Minimum Stock', 'A1,Product 1,2', 'A2,Product 2,2'];
  const preview = await previewSiteProductList(db, SITE, csvFile(lines));
  assert.deepEqual(preview.removed.map((row) => row.sku), ['A3']);
  assert.equal(preview.unchangedCount, 2);
  assert.equal(preview.largeRemoval, false);

  await replaceWith(db, csvFile(lines), preview);
  assert.deepEqual(db.listJson(SITE).map((row) => row.sku), ['A1', 'A2']);
  assert.deepEqual(db.listJson(OTHER_SITE).map((row) => row.sku), ['A3']);
  assert.equal(db.tables.products.find((product) => product.id === 'p3').deleted_at, null);
});

test('a changed product code removes the old code and adds the new one', async () => {
  const db = database(seedProducts(3));
  const lines = ['Product code,Product name,Minimum stock', 'A1,Product 1,2', 'A2,Product 2,2', 'A3-NEW,Product 3,2'];
  const preview = await previewSiteProductList(db, SITE, csvFile(lines));
  assert.deepEqual(preview.added.map((row) => row.sku), ['A3-NEW']);
  assert.deepEqual(preview.removed.map((row) => row.sku), ['A3']);
  assert.equal(preview.updated.length, 0);
});

test('changed values are shown before and after', async () => {
  const db = database(seedProducts(2));
  const lines = ['Product code,Product name,Minimum stock', 'A1,Product 1,4', 'a2,Product 2,2'];
  const preview = await previewSiteProductList(db, SITE, csvFile(lines));
  assert.deepEqual(preview.updated, [{
    sku: 'A1', name: 'Product 1',
    changes: [{ field: 'minimum_quantity', label: 'Minimum', before: 2, after: 4 }],
  }]);
  // Product codes match without regard to case, like the database.
  assert.equal(preview.unchangedCount, 1);
});

test('duplicate product codes are rejected', async () => {
  const db = database();
  const lines = ['Product code,Product name,Minimum stock', 'A1,Apron,2', 'B1,Boot,1', 'a1,Apron again,3'];
  const preview = await previewSiteProductList(db, SITE, csvFile(lines));
  assert.equal(preview.canReplace, false);
  assert.deepEqual(preview.errors.map((error) => error.row), [2, 4]);
  assert.match(preview.errors[0].message, /Duplicate product code in spreadsheet rows 2, 4/);
  assert.deepEqual([preview.added.length, preview.removed.length], [0, 0]);
  await assert.rejects(replaceWith(db, csvFile(lines), preview), /Row 2: Duplicate product code/);
  assert.equal(db.rpcCalls.some((call) => call.name === 'replace_site_product_list'), false);
});

test('an empty file is rejected and the list is kept', async () => {
  const db = database(seedProducts(2));
  const headerOnly = await previewSiteProductList(db, SITE, csvFile(['Product code,Product name,Minimum stock', ',,']));
  assert.equal(headerOnly.canReplace, false);
  assert.match(headerOnly.errors[0].message, /no product rows/);
  await assert.rejects(replaceWith(db, csvFile(['Product code,Product name,Minimum stock']), headerOnly), /no product rows/);
  await assert.rejects(previewSiteProductList(db, SITE, new File([], 'empty.csv')), /empty/);
  assert.equal(db.listJson(SITE).length, 2);
});

test('invalid rows block the replace and are listed by row', async () => {
  const db = database();
  const lines = ['Product code,Product name,Minimum stock,Pack size', 'A1,Apron,lots,', ',Boot,2,', 'C1,,1,0'];
  const preview = await previewSiteProductList(db, SITE, csvFile(lines));
  assert.equal(preview.canReplace, false);
  assert.deepEqual(preview.errors.map((error) => [error.row, error.field]), [
    [2, 'minimum_quantity'], [3, 'sku'], [4, 'name'], [4, 'pack_size'],
  ]);
  assert.equal(preview.invalidRows, 3);
});

test('a catalogue file without minimum stock is not a site list', async () => {
  const db = database();
  const preview = await previewSiteProductList(db, SITE, csvFile(['Product code,Product name,Default unit', 'A1,Apron,ea']));
  assert.equal(preview.canReplace, false);
  assert.match(preview.errors[0].message, /Missing required column: Minimum stock/);
});

test('removing more than half of the list needs a second confirmation', async () => {
  const db = database(seedProducts(4));
  const keepOne = ['Product code,Product name,Minimum stock', 'A1,Product 1,2'];
  const preview = await previewSiteProductList(db, SITE, csvFile(keepOne));
  assert.equal(preview.largeRemoval, true);
  assert.equal(preview.removed.length, 3);
  await assert.rejects(replaceWith(db, csvFile(keepOne), preview), /removes 3 of 4 products/);
  const result = await replaceWith(db, csvFile(keepOne), preview, { confirmLargeRemoval: true });
  assert.equal(result.removed, 3);

  assert.equal(isLargeRemoval(2, 4), false);
  assert.equal(isLargeRemoval(3, 5), true);
  assert.equal(isLargeRemoval(0, 0), false);
});

test('a workbook naming another site needs confirmation', async () => {
  const db = database();
  const workbook = [
    'Name,Bayside Cafe',
    'Address,"1 Beach Rd, Bayside NSW 2000"',
    '',
    'Code,Item Description,Minium Stock',
    ',CLEANING,',
    'A1,Apron,2 ctn',
  ];
  const preview = await previewSiteProductList(db, SITE, csvFile(workbook, 'Bayside.csv'));
  assert.equal(preview.siteNameMismatch, true);
  assert.equal(preview.fileSiteName, 'Bayside Cafe');
  assert.equal(preview.added.length, 1);
  await assert.rejects(replaceWith(db, csvFile(workbook), preview), /This file says "Bayside Cafe" but you are uploading to "Fast Fuel Meals"/);
  assert.equal((await replaceWith(db, csvFile(workbook), preview, { confirmSiteMismatch: true })).status, 'applied');

  const matching = workbook.map((line) => line.replace('Bayside Cafe', 'FAST FUEL meals'));
  assert.equal((await previewSiteProductList(db, SITE, csvFile(matching))).siteNameMismatch, false);
});

test('renamed products that other sites use are reported', async () => {
  const db = database(seedProducts(2));
  db.tables.site_products.push(
    { id: 'o1', site_id: OTHER_SITE, product_id: 'p1', minimum_quantity: 1, unit_of_measure: 'ea', order_multiple: 1, notes: null, deleted_at: null },
    { id: 'o2', site_id: OTHER_SITE, product_id: 'p2', minimum_quantity: 1, unit_of_measure: 'ea', order_multiple: 1, notes: null, deleted_at: '2026-01-01' },
  );
  const lines = ['Product code,Product name,Minimum stock', 'A1,Product 1 large,2', 'A2,Product 2 renamed,2'];
  const preview = await previewSiteProductList(db, SITE, csvFile(lines));
  assert.deepEqual(preview.renamedShared, [{ sku: 'A1', oldName: 'Product 1', newName: 'Product 1 large', otherSites: 1 }]);
  assert.equal(preview.updated.length, 2);
});

test('replace sends the parsed rows, actor, previewed version and file checksum', async () => {
  const db = database(seedProducts(1));
  const text = ['Product code,Product name,Minimum stock,Unit,Pack size,Pack unit', 'A1,Product 1,3,ctn,12,each'];
  const preview = await previewSiteProductList(db, SITE, csvFile(text));
  await replaceWith(db, csvFile(text), preview);
  const call = db.rpcCalls.find((entry) => entry.name === 'replace_site_product_list');
  assert.equal(call.params.p_actor, 'u1');
  assert.equal(call.params.p_expected_version, 0);
  assert.equal(call.params.p_file_name, 'FastFuel.csv');
  assert.equal(call.params.p_file_sha256, crypto.createHash('sha256').update(text.join('\r\n')).digest('hex'));
  assert.deepEqual(call.params.p_rows, [{
    sku: 'A1', name: 'Product 1', default_unit: 'ctn', pack_size: 12, pack_unit: 'each',
    minimum_quantity: 3, unit_of_measure: 'ctn', order_multiple: 1, notes: null,
  }]);

  // The list changed after this preview, so the database refuses it.
  await assert.rejects(replaceWith(db, csvFile(text), preview), /changed since this file was previewed/);
});

test('history shows the last upload and restore only accepts this site', async () => {
  const db = database(seedProducts(2));
  const lines = ['Product code,Product name,Minimum stock', 'A1,Product 1,2'];
  const preview = await previewSiteProductList(db, SITE, csvFile(lines));
  const applied = await replaceWith(db, csvFile(lines), preview);
  const info = await getSiteProductList(db, SITE);
  assert.equal(info.lastUpload.uploaded_by_name, 'Jane');
  assert.equal(info.lastUpload.file_name, 'FastFuel.csv');
  assert.equal(info.site.product_list_version, 1);
  assert.deepEqual(info.products.map((row) => row.sku), ['A1']);

  await assert.rejects(restoreSiteProductList(db, 'u1', OTHER_SITE, applied.upload_id), /not found for this site/);
  const restored = await restoreSiteProductList(db, 'u1', SITE, applied.upload_id);
  assert.equal(restored.status, 'applied');
  assert.deepEqual(db.listJson(SITE).map((row) => row.sku), ['A1', 'A2']);
});

test('the products page import rejects site product lists', async () => {
  const db = database();
  await assert.rejects(
    previewProductImport(db, csvFile(['Product code,Product name,Minimum stock', 'A1,Apron,2'])),
    /This is a site product list\. Open Sites → the site → Upload site product list\./,
  );
  const catalogue = await previewProductImport(db, csvFile(['Product code,Product name,Default unit', 'A1,Apron,ea']));
  assert.equal(catalogue.canImport, true);
  assert.equal(catalogue.createCount, 1);
});

test('the diff treats blank text and the default order multiple like the database', () => {
  const row = { sku: 'A1', name: 'Apron', default_unit: 'ea', pack_size: null, pack_unit: null, minimum_quantity: 2, unit_of_measure: 'ea', order_multiple: 1, notes: null };
  const stored = { ...row, pack_unit: '', order_multiple: null, notes: ' ', minimum_quantity: '2.0' };
  assert.deepEqual(diffSiteProductList([stored], [row]), { added: [], updated: [], removed: [], unchanged: 1 });
});
