const router = require('express').Router();
const db = require('../db');
const { asyncHandler } = require('../http');

// Expands non-recurring (unpaid only) and recurring transactions into dated
// entries within the 13-week projection window. Recurring rows step by their
// frequency's interval from due_date until the window end (or recurrence_end).
const entriesCte = `
  params AS (
    SELECT
      MAX(balance_date) AS start_date,
      (SELECT balance_amount FROM balance WHERE balance_date = (SELECT MAX(balance_date) FROM balance)) AS initial_balance
    FROM balance
  ),
  entries AS (
    SELECT is_income, amount, category, counterparty, due_date AS effective_date
    FROM transaction
    CROSS JOIN params
    WHERE recurrence IS NULL
      AND paid = FALSE
      AND due_date >= params.start_date
      AND due_date <= params.start_date + 90
    UNION ALL
    SELECT t.is_income, t.amount, t.category, t.counterparty, occ::date AS effective_date
    FROM transaction t
    CROSS JOIN params
    CROSS JOIN LATERAL (
      SELECT CASE t.recurrence
        WHEN 'weekly' THEN INTERVAL '1 week'
        WHEN 'monthly' THEN INTERVAL '1 month'
        WHEN 'quarterly' THEN INTERVAL '3 months'
        WHEN 'annually' THEN INTERVAL '1 year'
      END AS step
    ) iv
    CROSS JOIN LATERAL generate_series(
      t.due_date::timestamp, (params.start_date + 90)::timestamp, iv.step
    ) AS occ
    WHERE t.recurrence IN ('weekly', 'monthly', 'quarterly', 'annually')
      AND occ::date >= params.start_date
      AND (t.recurrence_end IS NULL OR occ::date <= t.recurrence_end)
      -- Occurrences the user has marked handled (paid/skipped) are excluded.
      AND NOT EXISTS (
        SELECT 1 FROM recurrence_exception re
        WHERE re.transaction_id = t.id AND re.occurrence_date = occ::date
      )
  )
`;

router.get(
  '/',
  asyncHandler(async (req, res) => {
    // The projection is anchored to the most recent balance snapshot; expose
    // that anchor so the UI can warn when it has gone stale. With no balance
    // on record there is nothing to project from, so return empty results and
    // let the UI show an onboarding hint instead of a broken chart.
    const { rows: anchorRows } = await db.query(
      "SELECT to_char(MAX(balance_date), 'YYYY-MM-DD') AS start_date FROM balance"
    );
    const startDate = anchorRows[0].start_date;
    if (!startDate) {
      return res.json({ start_date: null, balances: [], receipts: [], payments: [] });
    }

    const balancesQuery = `
    WITH ${entriesCte},
    weeks AS (SELECT generate_series(1, 13) AS wk),
    income_weekly AS (
      SELECT (effective_date - params.start_date) / 7 + 1 AS wk, SUM(amount) AS total_in
      FROM entries CROSS JOIN params WHERE is_income = TRUE GROUP BY 1
    ),
    expense_weekly AS (
      SELECT (effective_date - params.start_date) / 7 + 1 AS wk, SUM(amount) AS total_out
      FROM entries CROSS JOIN params WHERE is_income = FALSE GROUP BY 1
    ),
    weekly_net AS (
      SELECT
        w.wk AS week_number,
        params.start_date + (w.wk * 7 - 1) AS week_end,
        COALESCE(iw.total_in, 0) - COALESCE(ew.total_out, 0) AS net_change
      FROM weeks w
      CROSS JOIN params
      LEFT JOIN income_weekly iw ON w.wk = iw.wk
      LEFT JOIN expense_weekly ew ON w.wk = ew.wk
    )
    SELECT
      wn.week_number,
      wn.week_end,
      params.initial_balance + COALESCE(
        SUM(wn.net_change) OVER (ORDER BY wn.week_number ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0
      ) AS start_balance,
      params.initial_balance + SUM(wn.net_change) OVER (ORDER BY wn.week_number) AS end_balance,
      wn.net_change
    FROM weekly_net wn
    CROSS JOIN params
    ORDER BY wn.week_number
  `;

    const receiptsQuery = `
    WITH ${entriesCte}
    SELECT
      (effective_date - params.start_date) / 7 + 1 AS week_number,
      params.start_date + ((effective_date - params.start_date) / 7 * 7 + 6) AS week_end,
      COALESCE(counterparty, 'Other') AS name,
      SUM(amount) AS amount
    FROM entries
    CROSS JOIN params
    WHERE is_income = TRUE
    GROUP BY 1, 2, 3
    ORDER BY 1, 3
  `;

    const paymentsQuery = `
    WITH ${entriesCte}
    SELECT
      (e.effective_date - params.start_date) / 7 + 1 AS week_number,
      params.start_date + ((e.effective_date - params.start_date) / 7 * 7 + 6) AS week_end,
      COALESCE(c.name, 'Other') AS name,
      SUM(e.amount) AS amount
    FROM entries e
    LEFT JOIN category c ON e.category = c.id
    CROSS JOIN params
    WHERE e.is_income = FALSE
    GROUP BY 1, 2, 3
    ORDER BY 1, 3
  `;

    const [balances, receipts, payments] = await Promise.all([
      db.query(balancesQuery),
      db.query(receiptsQuery),
      db.query(paymentsQuery),
    ]);

    res.json({
      start_date: startDate,
      balances: balances.rows,
      receipts: receipts.rows,
      payments: payments.rows,
    });
  })
);

module.exports = router;
