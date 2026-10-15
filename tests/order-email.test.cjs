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

const { countPhotos, orderEmailState } = load('lib/order-email.ts');
const { listOrders } = load('lib/services/admin-data.ts');

test('photos count only active uploads from the submitted manifest', () => {
  const attachments = [
    { id: 'A', deleted_at: null },
    { id: 'b', deleted_at: null },
    { id: 'c', deleted_at: '2026-10-15' },
    { id: 'extra', deleted_at: null },
  ];
  assert.deepEqual(countPhotos(['a', 'B', 'c'], attachments), { expected: 3, received: 2 });
  assert.deepEqual(countPhotos(null, attachments), { expected: null, received: 3 });
  assert.deepEqual(countPhotos([], []), { expected: 0, received: 0 });
});

test('email state follows the export row and waits for missing photos', () => {
  const completed = { status: 'completed', received_at: '2026-10-15T10:00:00Z' };
  const allPhotos = { expected: 2, received: 2 };
  const missing = { expected: 3, received: 2 };
  assert.equal(orderEmailState(completed, 'sent', missing), 'sent');
  assert.equal(orderEmailState(completed, 'sending', allPhotos), 'sending');
  assert.equal(orderEmailState(completed, 'failed', allPhotos), 'failed');
  assert.equal(orderEmailState(completed, 'pending', missing), 'waiting_photos');
  assert.equal(orderEmailState(completed, 'pending', allPhotos), 'pending');
  assert.equal(orderEmailState(completed, null, missing), 'waiting_photos');
  assert.equal(orderEmailState(completed, 'not_requested', allPhotos), 'pending');
  // Orders from before the new flow, and drafts, were never queued.
  assert.equal(orderEmailState({ status: 'completed', received_at: null }, null, { expected: null, received: 1 }), 'not_sent');
  assert.equal(orderEmailState({ status: 'draft', received_at: null }, null, allPhotos), 'not_sent');
});

function ordersDatabase() {
  const calls = [];
  const rows = [{
    id: 'o1', status: 'completed', started_at: '2026-10-15', completed_at: '2026-10-15', received_at: '2026-10-15',
    expected_attachment_ids: ['p1', 'p2'],
    customer_sites: { name: 'Fast Fuel Meals' },
    sales_reps: null,
    stock_count_exports: { file_name: 'order.xlsx', email_status: 'failed', generated_status: 'generated' },
    stock_count_attachments: [{ id: 'p1', deleted_at: null }],
  }];
  return {
    calls,
    from(table) {
      const query = {
        select(columns, options) { calls.push(['select', table, columns, options]); return query; },
        is() { return query; },
        or(filter, options) { calls.push(['or', filter, options]); return query; },
        order() { return query; },
        range() { return query; },
        then(resolve, reject) {
          return Promise.resolve({ data: rows, count: rows.length, error: null }).then(resolve, reject);
        },
      };
      return query;
    },
  };
}

test('orders list adds email and photo status and filters failed emails with an inner join', async () => {
  const db = ordersDatabase();
  const page = { page: 1, limit: 20, offset: 0 };
  const sort = { key: 'date', column: 'started_at', ascending: false };
  const result = await listOrders(db, page, sort, undefined, { email: 'failed' });
  assert.equal(result.orders[0].email_state, 'failed');
  assert.equal(result.orders[0].photos_expected, 2);
  assert.equal(result.orders[0].photos_received, 1);
  assert.equal('stock_count_attachments' in result.orders[0], false);
  assert.match(db.calls[0][2], /stock_count_exports!inner\(/);
  assert.deepEqual(db.calls[1], ['or', 'email_status.eq.failed,generated_status.eq.failed', { referencedTable: 'stock_count_exports' }]);

  const unfiltered = ordersDatabase();
  await listOrders(unfiltered, page, sort);
  assert.doesNotMatch(unfiltered.calls[0][2], /!inner/);
  assert.equal(unfiltered.calls.some((call) => call[0] === 'or'), false);
});
