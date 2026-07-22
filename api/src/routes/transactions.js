const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const { rows } = await db.query(`
    SELECT t.*, c.name AS category_name, p.name AS project_name
    FROM transaction t
    LEFT JOIN category c ON t.category = c.id
    LEFT JOIN project p ON t.project_id = p.id
    ORDER BY t.due_date
  `);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const {
    is_income,
    counterparty,
    description,
    amount,
    due_date,
    category,
    project_id,
    recurrence,
  } = req.body;
  const { rows } = await db.query(
    `INSERT INTO transaction (is_income, counterparty, description, amount, due_date, category, project_id, recurrence)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      is_income,
      counterparty,
      description,
      amount,
      due_date,
      category || null,
      project_id || null,
      recurrence || null,
    ]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const {
    is_income,
    counterparty,
    description,
    amount,
    due_date,
    category,
    project_id,
    recurrence,
  } = req.body;
  const { rows } = await db.query(
    `UPDATE transaction SET is_income=$1, counterparty=$2, description=$3, amount=$4,
     due_date=$5, category=$6, project_id=$7, recurrence=$8 WHERE id=$9 RETURNING *`,
    [
      is_income,
      counterparty,
      description,
      amount,
      due_date,
      category || null,
      project_id || null,
      recurrence || null,
      req.params.id,
    ]
  );
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

router.patch('/:id/paid', async (req, res) => {
  const { rows } = await db.query('UPDATE transaction SET paid = $1 WHERE id = $2 RETURNING *', [
    req.body.paid,
    req.params.id,
  ]);
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM transaction WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
