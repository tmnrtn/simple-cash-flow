const router = require('express').Router();
const db = require('../db');

router.get('/', async (req, res) => {
  const { rows } = await db.query('SELECT * FROM project ORDER BY name');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  const { rows } = await db.query('INSERT INTO project (name) VALUES ($1) RETURNING *', [name]);
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { name } = req.body;
  const { rows } = await db.query('UPDATE project SET name = $1 WHERE id = $2 RETURNING *', [
    name,
    req.params.id,
  ]);
  rows.length ? res.json(rows[0]) : res.status(404).json({ error: 'Not found' });
});

router.delete('/:id', async (req, res) => {
  await db.query('DELETE FROM project WHERE id = $1', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
