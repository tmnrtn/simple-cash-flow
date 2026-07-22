const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Router } = require('express');

// --- Configuration (from environment) ---------------------------------------

const AUTH_DISABLED = process.env.AUTH_DISABLED === 'true';
const USERNAME = process.env.AUTH_USERNAME || 'admin';
const PASSWORD = process.env.AUTH_PASSWORD || '';
const PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH || '';
const SECRET = process.env.AUTH_SECRET || '';

const COOKIE_NAME = 'session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Login rate limiting (in-memory; adequate for a single-instance deployment).
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 10;
const attempts = new Map(); // ip -> { count, resetAt }

// Called once at startup so misconfiguration fails fast with a clear message
// instead of silently leaving the app unprotected.
function assertAuthConfig() {
  if (AUTH_DISABLED) {
    console.warn(
      'WARNING: AUTH_DISABLED=true — the API is unprotected. Only use this on a trusted private network.'
    );
    return;
  }
  const problems = [];
  if (!PASSWORD && !PASSWORD_HASH) {
    problems.push('Set AUTH_PASSWORD (or AUTH_PASSWORD_HASH) to the login password.');
  }
  if (!SECRET) {
    problems.push('Set AUTH_SECRET to a long random string used to sign session cookies.');
  }
  if (problems.length) {
    console.error(
      'Authentication is enabled but not configured:\n  - ' +
        problems.join('\n  - ') +
        '\nAlternatively set AUTH_DISABLED=true for trusted private-network use.'
    );
    process.exit(1);
  }
}

// --- Token signing (HMAC over a base64url payload) --------------------------

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verify(token) {
  if (!token || !token.includes('.')) return null;
  const [data, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.from(data, 'base64url').toString());
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp < Date.now()) return null;
  return payload;
}

// --- Credential checking ----------------------------------------------------

function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

async function checkCredentials(username, password) {
  if (typeof username !== 'string' || typeof password !== 'string') return false;
  if (!safeEqual(username, USERNAME)) return false;
  if (PASSWORD_HASH) return bcrypt.compare(password, PASSWORD_HASH);
  return safeEqual(password, PASSWORD);
}

function rateLimited(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function getSessionCookie(req) {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === COOKIE_NAME) return decodeURIComponent(rest.join('='));
  }
  return null;
}

function setSessionCookie(req, res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    // Mark Secure when the request arrived over HTTPS (directly or via a proxy
    // that set X-Forwarded-Proto). Requires app.set('trust proxy', ...).
    secure: req.secure,
    maxAge: SESSION_TTL_MS,
    path: '/',
  });
}

// --- Middleware & routes ----------------------------------------------------

function authMiddleware(req, res, next) {
  if (AUTH_DISABLED) return next();
  const payload = verify(getSessionCookie(req));
  if (!payload) return res.status(401).json({ error: 'Not authenticated' });
  req.user = payload.u;
  next();
}

const router = Router();

router.get('/me', (req, res) => {
  if (AUTH_DISABLED) {
    return res.json({ authenticated: true, authDisabled: true, username: null });
  }
  const payload = verify(getSessionCookie(req));
  if (!payload) return res.json({ authenticated: false, authDisabled: false, username: null });
  res.json({ authenticated: true, authDisabled: false, username: payload.u });
});

router.post('/login', async (req, res) => {
  if (AUTH_DISABLED) return res.json({ authenticated: true, authDisabled: true });

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
  }

  const { username, password } = req.body || {};
  if (!(await checkCredentials(username, password))) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  attempts.delete(ip);
  const token = sign({ u: USERNAME, exp: Date.now() + SESSION_TTL_MS });
  setSessionCookie(req, res, token);
  res.json({ authenticated: true, username: USERNAME });
});

router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ authenticated: false });
});

module.exports = { router, authMiddleware, assertAuthConfig, AUTH_DISABLED };
