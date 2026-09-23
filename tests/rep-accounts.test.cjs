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
    if (name === '@/lib/api/server') return { nowIso: () => '2026-09-23T00:00:00.000Z' };
    if (name.startsWith('@/')) return load(`${name.slice(2)}.ts`);
    return require(name);
  };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, { filename })(
    localRequire, module, module.exports,
  );
  return module.exports;
}

const { createRep, deleteRep, createAdmin } = load('lib/services/admin-data.ts');

function database({ authDeleteError, repInsertError } = {}) {
  const tables = {
    users: [
      { id: 'u1', email: 'rep@foodcare.com.au', deleted_at: null },
      { id: 'u2', email: 'boss@foodcare.com.au', deleted_at: null },
      { id: 'old', email: 'former@foodcare.com.au', deleted_at: '2026-01-01' },
    ],
    sales_reps: [
      { id: 'r1', user_id: 'u1', employee_code: 'NSW1', deleted_at: null },
      { id: 'r2', user_id: 'u2', employee_code: 'VIC1', deleted_at: null },
      { id: 'r3', user_id: 'old', employee_code: 'OLD1', deleted_at: '2026-01-01' },
    ],
    admin_users: [{ user_id: 'u2', role: 'admin', deleted_at: null }],
  };
  const logins = new Set(['u1', 'u2']);
  const authCalls = [];
  let nextId = 1;

  const from = (table) => {
    let rows = tables[table];
    let action = 'select';
    let payload;
    const filters = [];
    const matches = (row) => filters.every(([key, value]) => row[key] === value);
    const run = () => {
      if (action === 'insert') {
        if (table === 'sales_reps' && repInsertError) return { data: null, error: repInsertError };
        tables[table].push({ deleted_at: null, ...payload });
        return { data: null, error: null };
      }
      const hits = rows.filter(matches);
      if (action === 'update') hits.forEach((row) => Object.assign(row, payload));
      if (action === 'delete') tables[table] = rows.filter((row) => !matches(row));
      return { data: hits, error: null };
    };
    const query = {
      select() { return query; },
      eq(key, value) { filters.push([key, value]); return query; },
      is(key, value) { filters.push([key, value]); return query; },
      update(values) { action = 'update'; payload = values; return query; },
      delete() { action = 'delete'; return query; },
      insert(values) { action = 'insert'; payload = values; return query; },
      upsert(values) { action = 'insert'; payload = values; return query; },
      maybeSingle() {
        const { data, error } = run();
        return Promise.resolve({ data: data?.[0] ?? null, error });
      },
      then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject); },
    };
    return query;
  };

  const auth = {
    admin: {
      async createUser({ email }) {
        const id = `new${nextId++}`;
        logins.add(id);
        tables.users.push({ id, email, deleted_at: null });
        authCalls.push(['create', id]);
        return { data: { user: { id } }, error: null };
      },
      async deleteUser(id) {
        authCalls.push(['delete', id]);
        if (authDeleteError) return { data: null, error: authDeleteError };
        if (!logins.delete(id)) return { data: null, error: { status: 404, message: 'User not found' } };
        return { data: {}, error: null };
      },
      async getUserById(id) {
        if (!logins.has(id)) return { data: { user: null }, error: { status: 404, message: 'User not found' } };
        return { data: { user: { id } }, error: null };
      },
    },
  };

  return { tables, logins, authCalls, from, auth };
}

const row = (db, table, key, value) => db.tables[table].find((r) => r[key] === value);

test('deleting a rep removes their login and keeps their profile for order history', async () => {
  const db = database();
  await deleteRep(db, 'r1', false);
  assert.equal(db.logins.has('u1'), false);
  assert.equal(row(db, 'users', 'id', 'u1').deleted_at, '2026-09-23T00:00:00.000Z');
  assert.equal(row(db, 'sales_reps', 'id', 'r1').deleted_at, '2026-09-23T00:00:00.000Z');
});

test('a rep stays visible when their login cannot be removed', async () => {
  const db = database({ authDeleteError: { status: 500, message: 'Database error deleting user' } });
  await assert.rejects(deleteRep(db, 'r1', false), /Database error deleting user/);
  assert.equal(row(db, 'sales_reps', 'id', 'r1').deleted_at, null);
  assert.equal(row(db, 'users', 'id', 'u1').deleted_at, null);
});

test('deleting a rep whose login is already gone still hides the rep', async () => {
  const db = database();
  db.logins.delete('u1');
  await deleteRep(db, 'r1', false);
  assert.equal(row(db, 'sales_reps', 'id', 'r1').deleted_at, '2026-09-23T00:00:00.000Z');
});

test('reps with dashboard access are not deleted', async () => {
  const db = database();
  await assert.rejects(deleteRep(db, 'r2', false), /dashboard access/);
  assert.equal(db.logins.has('u2'), true);
  assert.deepEqual(db.authCalls, []);
});

test('reps without a login cannot be restored', async () => {
  const db = database();
  await assert.rejects(deleteRep(db, 'r3', true), /login was removed/);
  assert.equal(row(db, 'sales_reps', 'id', 'r3').deleted_at, '2026-01-01');
});

test('a failed rep insert removes the login it just created', async () => {
  const db = database({ repInsertError: { code: '23505', message: 'duplicate key value' } });
  await assert.rejects(
    createRep(db, { email: 'new@foodcare.com.au', password: 'password1', display_name: 'New' }),
    /already in use/,
  );
  assert.deepEqual(db.authCalls, [['create', 'new1'], ['delete', 'new1']]);
  assert.equal(row(db, 'users', 'email', 'new@foodcare.com.au'), undefined);
});

test('an employee code held by a deleted rep is rejected before creating a login', async () => {
  const db = database();
  await assert.rejects(
    createRep(db, { email: 'new@foodcare.com.au', password: 'password1', display_name: 'New', employee_code: 'OLD1' }),
    /belongs to a deleted rep/,
  );
  assert.deepEqual(db.authCalls, []);
});

test('dashboard access for a former rep email creates a fresh login', async () => {
  const db = database();
  await createAdmin(db, { email: 'former@foodcare.com.au', password: 'password1', display_name: 'Former' });
  assert.deepEqual(db.authCalls, [['create', 'new1']]);
  assert.equal(row(db, 'admin_users', 'user_id', 'new1').role, 'admin');
});
