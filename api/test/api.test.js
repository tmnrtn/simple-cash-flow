// Integration tests against a real PostgreSQL (via testcontainers). Auth is
// disabled here so we can exercise the data routes directly; auth itself is
// covered in auth.test.js. Env must be set before requiring db/app.
process.env.AUTH_DISABLED = 'true';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { PostgreSqlContainer } = require('@testcontainers/postgresql');

let container;
let db;
let server;
let baseURL;

before(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine').start();
  process.env.DB_HOST = container.getHost();
  process.env.DB_PORT = String(container.getPort());
  process.env.DB_NAME = container.getDatabase();
  process.env.DB_USER = container.getUsername();
  process.env.DB_PASSWORD = container.getPassword();

  db = require('../src/db');
  const { migrate } = require('../src/migrate');
  await migrate(db);

  const app = require('../src/index');
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server?.close();
  await db?.end();
  await container?.stop();
});

const get = (p) => fetch(`${baseURL}${p}`).then((r) => r.json());

test('health endpoint responds', async () => {
  const res = await fetch(`${baseURL}/api/health`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { status: 'ok' });
});

test('migrations are recorded and re-running is a no-op', async () => {
  const { migrate } = require('../src/migrate');
  const first = await db.query('SELECT name FROM schema_migrations');
  assert.ok(first.rows.some((r) => r.name === '0001_initial_schema.sql'));

  await migrate(db); // idempotent — should apply nothing new and not throw
  const second = await db.query('SELECT COUNT(*)::int AS n FROM schema_migrations');
  assert.strictEqual(second.rows[0].n, first.rows.length);
});

test('categories: starter categories are seeded and new ones can be created', async () => {
  const before = await get('/api/categories');
  assert.strictEqual(before.length, 4);

  const res = await fetch(`${baseURL}/api/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Marketing' }),
  });
  assert.strictEqual(res.status, 201);

  const after = await get('/api/categories');
  assert.strictEqual(after.length, 5);
  assert.ok(after.some((c) => c.name === 'Marketing'));
});

test('dashboard is empty when there is no balance', async () => {
  const data = await get('/api/dashboard');
  assert.deepStrictEqual(data, { balances: [], receipts: [], payments: [] });
});

test('dashboard projects the 13-week forecast with recurrence and paid rules', async () => {
  // Anchor the projection to a known start date.
  await db.query("INSERT INTO balance (balance_date, balance_amount) VALUES ('2026-01-05', 1000)");
  await db.query(`
    INSERT INTO transaction (is_income, counterparty, amount, due_date, category, paid, recurrence) VALUES
      (TRUE,  'UnpaidIncome', 500, '2026-01-07', NULL, FALSE, NULL),      -- counts (week 1)
      (TRUE,  'PaidIncome',   999, '2026-01-08', NULL, TRUE,  NULL),      -- excluded (paid, non-recurring)
      (FALSE, 'MonthlyRent',  100, '2026-01-05', NULL, FALSE, 'monthly')  -- recurs across the window
  `);

  const { balances, receipts, payments } = await get('/api/dashboard');

  // 13 weeks projected.
  assert.strictEqual(balances.length, 13);

  // Week 1: +500 income, -100 rent => net 400; running balance 1000 -> 1400.
  const wk1 = balances.find((b) => b.week_number === 1);
  assert.strictEqual(Number(wk1.start_balance), 1000);
  assert.strictEqual(Number(wk1.net_change), 400);
  assert.strictEqual(Number(wk1.end_balance), 1400);

  // Receipts exclude the paid, non-recurring income.
  const receiptTotal = receipts.reduce((s, r) => s + Number(r.amount), 0);
  assert.strictEqual(receiptTotal, 500);
  assert.ok(!receipts.some((r) => Number(r.amount) === 999));

  // The monthly rent is projected forward into several distinct weeks.
  const rentWeeks = new Set(payments.map((p) => p.week_number));
  assert.ok(rentWeeks.size >= 3, `expected recurring rent across >=3 weeks, got ${rentWeeks.size}`);
  assert.ok(payments.every((p) => Number(p.amount) === 100));
});
