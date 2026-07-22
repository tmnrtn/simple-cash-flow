const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
// Arbitrary constant so concurrent API starts serialize on the same lock.
const LOCK_KEY = 927153;

function migrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
}

// Applies any pending SQL migrations from api/migrations in filename order.
// Each runs in its own transaction and is recorded in schema_migrations.
async function migrate(db) {
  const client = await db.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const applied = new Set(
      (await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name)
    );
    const files = migrationFiles();

    // Adopt a pre-migrations database (schema created by the old init.sql):
    // record the initial migration as applied instead of re-running it.
    if (applied.size === 0 && files.length > 0) {
      const existing = await client.query("SELECT to_regclass('public.transaction') AS t");
      if (existing.rows[0].t) {
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [files[0]]);
        applied.add(files[0]);
        console.log(`Baselined existing schema at migration ${files[0]}`);
      }
    }

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      console.log(`Applying migration ${file}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${err.message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
    client.release();
  }
}

module.exports = { migrate };
