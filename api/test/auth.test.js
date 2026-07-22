// Auth unit tests — no database required (auth.js never touches the DB).
// Env must be set before requiring auth.js, which reads config at load time.
process.env.AUTH_DISABLED = 'false';
process.env.AUTH_USERNAME = 'admin';
process.env.AUTH_PASSWORD = 'hunter2';
process.env.AUTH_SECRET = 'test-secret-0123456789abcdef';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const express = require('express');
const { router, authMiddleware } = require('../src/auth');

let server;
let baseURL;

before(async () => {
  const app = express();
  app.use(express.json());
  app.set('trust proxy', 1);
  app.use('/api/auth', router);
  app.use(authMiddleware);
  app.get('/api/protected', (req, res) => res.json({ user: req.user }));

  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseURL = `http://127.0.0.1:${server.address().port}`;
});

after(() => server?.close());

function login(body) {
  return fetch(`${baseURL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('protected route rejects requests without a session', async () => {
  const res = await fetch(`${baseURL}/api/protected`);
  assert.strictEqual(res.status, 401);
});

test('login rejects wrong credentials', async () => {
  const res = await login({ username: 'admin', password: 'wrong' });
  assert.strictEqual(res.status, 401);
});

test('login succeeds and issues a session cookie that unlocks protected routes', async () => {
  const res = await login({ username: 'admin', password: 'hunter2' });
  assert.strictEqual(res.status, 200);

  const setCookie = res.headers.get('set-cookie');
  assert.match(setCookie, /session=/);
  assert.match(setCookie, /HttpOnly/i);

  const cookie = setCookie.split(';')[0];
  const protectedRes = await fetch(`${baseURL}/api/protected`, { headers: { cookie } });
  assert.strictEqual(protectedRes.status, 200);
  const body = await protectedRes.json();
  assert.strictEqual(body.user, 'admin');
});

test('me reports authentication state', async () => {
  const anon = await (await fetch(`${baseURL}/api/auth/me`)).json();
  assert.strictEqual(anon.authenticated, false);

  const cookie = (await login({ username: 'admin', password: 'hunter2' })).headers
    .get('set-cookie')
    .split(';')[0];
  const me = await (await fetch(`${baseURL}/api/auth/me`, { headers: { cookie } })).json();
  assert.strictEqual(me.authenticated, true);
  assert.strictEqual(me.username, 'admin');
});

test('a tampered session cookie is rejected', async () => {
  const cookie = (await login({ username: 'admin', password: 'hunter2' })).headers
    .get('set-cookie')
    .split(';')[0];
  const tampered = cookie.slice(0, -2) + (cookie.endsWith('aa') ? 'bb' : 'aa');
  const res = await fetch(`${baseURL}/api/protected`, { headers: { cookie: tampered } });
  assert.strictEqual(res.status, 401);
});
