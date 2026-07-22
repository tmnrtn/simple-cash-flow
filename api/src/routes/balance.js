const router = require('express').Router();
const db = require('../db');
const { asyncHandler, v } = require('../http');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await db.query('SELECT * FROM balance ORDER BY balance_date DESC');
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const balance_date = v.date(req.body.balance_date, 'balance_date');
    const balance_amount = v.number(req.body.balance_amount, 'balance_amount');
    const { rows } = await db.query(
      'INSERT INTO balance (balance_date, balance_amount) VALUES ($1, $2) RETURNING *',
      [balance_date, balance_amount]
    );
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = v.id(req.params.id);
    const balance_date = v.date(req.body.balance_date, 'balance_date');
    const balance_amount = v.number(req.body.balance_amount, 'balance_amount');
    const { rows } = await db.query(
      'UPDATE balance SET balance_date = $1, balance_amount = $2 WHERE id = $3 RETURNING *',
      [balance_date, balance_amount, id]
    );
    rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = v.id(req.params.id);
    await db.query('DELETE FROM balance WHERE id = $1', [id]);
    res.status(204).end();
  })
);

module.exports = router;
