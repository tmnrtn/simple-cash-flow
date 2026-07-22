const router = require('express').Router();
const db = require('../db');
const { asyncHandler, v } = require('../http');

// Validate and coerce a transaction body into ordered column values.
function parseTransaction(body) {
  return [
    v.boolean(body.is_income, 'is_income'),
    v.string(body.counterparty, 'counterparty', { required: false }),
    v.string(body.description, 'description', { required: false }),
    v.number(body.amount, 'amount', { positive: true }),
    v.date(body.due_date, 'due_date'),
    v.id(body.category, 'category', { required: false }),
    v.id(body.project_id, 'project_id', { required: false }),
    v.enum(body.recurrence, 'recurrence', ['monthly'], { required: false }),
  ];
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await db.query(`
      SELECT t.*, c.name AS category_name, p.name AS project_name
      FROM transaction t
      LEFT JOIN category c ON t.category = c.id
      LEFT JOIN project p ON t.project_id = p.id
      ORDER BY t.due_date
    `);
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const values = parseTransaction(req.body);
    const { rows } = await db.query(
      `INSERT INTO transaction (is_income, counterparty, description, amount, due_date, category, project_id, recurrence)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
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
       due_date=$5, category=$6, project_id=$7, recurrence=$8 WHERE id=$9 RETURNING *`,
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

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = v.id(req.params.id);
    await db.query('DELETE FROM transaction WHERE id = $1', [id]);
    res.status(204).end();
  })
);

module.exports = router;
