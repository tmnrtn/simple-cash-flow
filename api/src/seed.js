const fs = require('fs');
const path = require('path');

const SEED_FILE = path.join(__dirname, '..', 'demo-seed.sql');

// Loads the fictional demo dataset when DEMO_DATA=true, but only into a
// database that has no balance yet — so it seeds a fresh install and never
// duplicates on restart or clobbers real data.
async function maybeSeedDemo(db) {
  if (process.env.DEMO_DATA !== 'true') return;
  const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM balance');
  if (rows[0].n > 0) return;
  console.log('DEMO_DATA=true and no balance found — seeding demo dataset');
  await db.query(fs.readFileSync(SEED_FILE, 'utf8'));
}

module.exports = { maybeSeedDemo };
