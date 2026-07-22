const express = require('express');
const cors = require('cors');
const db = require('./db');
const { migrate } = require('./migrate');
const { maybeSeedDemo } = require('./seed');
const { notFoundHandler, errorHandler } = require('./http');
const { router: authRouter, authMiddleware, assertAuthConfig } = require('./auth');

assertAuthConfig();

const app = express();
// Trust the reverse proxy (web container / ingress) so req.secure and req.ip
// reflect the original client via X-Forwarded-* headers.
app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

// Unauthenticated liveness probe for container healthchecks.
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Public auth endpoints (login / logout / me).
app.use('/api/auth', authRouter);

// Everything below requires a valid session (unless AUTH_DISABLED=true).
app.use(authMiddleware);
app.use('/api/categories', require('./routes/categories'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/balance', require('./routes/balance'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Unmatched routes → 404, then centralised error handling (must be last).
app.use(notFoundHandler);
app.use(errorHandler);

// Run pending migrations (and optional demo seed) before serving traffic.
async function start() {
  await migrate(db);
  await maybeSeedDemo(db);
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`API listening on port ${PORT}`));
}

// Only start when run directly, so tests can import the app and control setup.
if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
}

module.exports = app;
