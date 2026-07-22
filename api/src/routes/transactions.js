const router = require('express').Router();
const db = require('../db');
const { asyncHandler, v, ApiError } = require('../http');

const RECURRENCES = ['weekly', 'monthly', 'quarterly', 'annually'];

// Validate and coerce a transaction body into ordered column values.
function parseTransaction(body) {
  const recurrence = v.enum(body.recurrence, 'recurrence', RECURRENCES, { required: false });
  const recurrence_end = v.date(body.recurrence_end, 'recurrence_end', { required: false });
  if (recurrence_end && !recurrence) {
    throw new ApiError(400, 'recurrence_end requires a recurrence');
  }
  return [
    v.boolean(body.is_income, 'is_income'),
    v.string(body.counterparty, 'counterparty', { required: false }),
    v.string(body.description, 'description', { required: false }),
    v.number(body.amount, 'amount', { positive: true }),
    v.date(body.due_date, 'due_date'),
    v.id(body.category, 'category', { required: false }),
    v.id(body.project_id, 'project_id', { required: false }),
    recurrence,
    recurrence_end,
  ];
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    // next_due_date is the next occurrence on/after today for recurring rows
    // (stepping by the recurrence interval from due_date, respecting
    // recurrence_end), and just due_date for one-offs. The list orders by it so
    // recurring items sort by when they are next due, not their original date.
    const { rows } = await db.query(`
      SELECT t.*, c.name AS category_name, p.name AS project_name,
        -- to_char keeps this a plain YYYY-MM-DD string, immune to the timezone
        -- shift the pg driver applies when parsing date columns into JS Dates.
        to_char(COALESCE(nd.next_due, t.due_date), 'YYYY-MM-DD') AS next_due_date,
        ex.exception_count,
        to_char(ex.last_exception, 'YYYY-MM-DD') AS last_exception_date
      FROM transaction t
      LEFT JOIN category c ON t.category = c.id
      LEFT JOIN project p ON t.project_id = p.id
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS exception_count, MAX(occurrence_date) AS last_exception
        FROM recurrence_exception re WHERE re.transaction_id = t.id
      ) ex ON true
      LEFT JOIN LATERAL (
        SELECT MIN(gs)::date AS next_due
        FROM generate_series(
          t.due_date,
          (CURRENT_DATE + INTERVAL '400 days')::date,
          CASE t.recurrence
            WHEN 'weekly' THEN INTERVAL '1 week'
            WHEN 'monthly' THEN INTERVAL '1 month'
            WHEN 'quarterly' THEN INTERVAL '3 months'
            WHEN 'annually' THEN INTERVAL '1 year'
            ELSE INTERVAL '1000 years'
          END
        ) AS gs
        WHERE t.recurrence IS NOT NULL
          AND gs >= CURRENT_DATE
          AND (t.recurrence_end IS NULL OR gs <= t.recurrence_end)
          -- Skip occurrences the user has marked handled.
          AND NOT EXISTS (
            SELECT 1 FROM recurrence_exception re
            WHERE re.transaction_id = t.id AND re.occurrence_date = gs::date
          )
      ) nd ON true
      ORDER BY COALESCE(nd.next_due, t.due_date), t.id
    `);
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const values = parseTransaction(req.body);
    const { rows } = await db.query(
      `INSERT INTO transaction (is_income, counterparty, description, amount, due_date, category, project_id, recurrence, recurrence_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      values
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = v.id(req.params.id);
    const values = parseTransaction(req.body);
    const { rows } = await db.query(
      `UPDATE transaction SET is_income=$1, counterparty=$2, description=$3, amount=$4,
       due_date=$5, category=$6, project_id=$7, recurrence=$8, recurrence_end=$9 WHERE id=$10 RETURNING *`,
      [...values, id]
    );
    rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
  })
);

router.patch(
  '/:id/paid',
  asyncHandler(async (req, res) => {
    const id = v.id(req.params.id);
    const paid = v.boolean(req.body.paid, 'paid');
    const { rows } = await db.query('UPDATE transaction SET paid = $1 WHERE id = $2 RETURNING *', [
      paid,
      id,
    ]);
    rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
  })
);

// Mark one occurrence of a recurring transaction as handled (paid/skipped).
// It is then excluded from the projection and skipped for next_due_date.
router.post(
  '/:id/exceptions',
  asyncHandler(async (req, res) => {
    const id = v.id(req.params.id);
    const occurrence_date = v.date(req.body.occurrence_date, 'occurrence_date');
    const { rows } = await db.query('SELECT recurrence FROM transaction WHERE id = $1', [id]);
    if (!rows.length) throw new ApiError(404, 'Not found');
    if (!rows[0].recurrence) {
      throw new ApiError(400, 'only recurring transactions have occurrences');
    }
    await db.query(
      `INSERT INTO recurrence_exception (transaction_id, occurrence_date)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [id, occurrence_date]
    );
    res.status(201).json({ transaction_id: id, occurrence_date });
  })
);

// Undo a handled occurrence.
router.delete(
  '/:id/exceptions/:date',
  asyncHandler(async (req, res) => {
    const id = v.id(req.params.id);
    const date = v.date(req.params.date, 'date');
    await db.query(
      'DELETE FROM recurrence_exception WHERE transaction_id = $1 AND occurrence_date = $2',
      [id, date]
    );
    res.status(204).end();
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = v.id(req.params.id);
    await db.query('DELETE FROM transaction WHERE id = $1', [id]);
    res.status(204).end();
  })
);

module.exports = router;
