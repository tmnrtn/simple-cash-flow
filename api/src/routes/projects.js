const router = require('express').Router();
const db = require('../db');
const { asyncHandler, v } = require('../http');

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { rows } = await db.query('SELECT * FROM project ORDER BY name');
    res.json(rows);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const name = v.string(req.body.name, 'name');
    const { rows } = await db.query('INSERT INTO project (name) VALUES ($1) RETURNING *', [name]);
    res.status(201).json(rows[0]);
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = v.id(req.params.id);
    const name = v.string(req.body.name, 'name');
    const { rows } = await db.query('UPDATE project SET name = $1 WHERE id = $2 RETURNING *', [
      name,
      id,
    ]);
    rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = v.id(req.params.id);
    await db.query('DELETE FROM project WHERE id = $1', [id]);
    res.status(204).end();
  })
);

module.exports = router;
