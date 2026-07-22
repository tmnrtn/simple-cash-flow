-- Optional demo dataset (fictional). Loaded by the API on startup when
-- DEMO_DATA=true and the database has no balance yet. Dates are relative to
-- CURRENT_DATE so the 13-week projection always has something to show.
INSERT INTO project (name) VALUES ('Website Redesign'), ('Mobile App');

INSERT INTO balance (balance_date, balance_amount) VALUES (CURRENT_DATE, 12500);

INSERT INTO transaction (is_income, counterparty, description, amount, due_date, category, project_id, paid, recurrence) VALUES
  -- Income
  (TRUE,  'Acme Ltd',      'Invoice #1024',   4800, CURRENT_DATE + 7,  NULL, (SELECT id FROM project WHERE name = 'Website Redesign'), FALSE, NULL),
  (TRUE,  'Globex Corp',   'Monthly retainer', 2500, CURRENT_DATE + 14, NULL, NULL,                                                     FALSE, 'monthly'),
  (TRUE,  'Initech',       'Milestone 2',     6000, CURRENT_DATE + 30, NULL, (SELECT id FROM project WHERE name = 'Mobile App'),      FALSE, NULL),
  (TRUE,  'Umbrella Co',   'Support hours',   1200, CURRENT_DATE + 52, NULL, NULL,                                                     FALSE, NULL),
  -- Expenses
  (FALSE, 'Payroll',       'Staff wages',     3200, CURRENT_DATE + 5,  (SELECT id FROM category WHERE name = 'Payroll'),     NULL,                                              FALSE, 'monthly'),
  (FALSE, 'Landlord',      'Office rent',     1500, CURRENT_DATE + 3,  (SELECT id FROM category WHERE name = 'Rent/Office'), NULL,                                              FALSE, 'monthly'),
  (FALSE, 'HMRC',          'VAT return',      2800, CURRENT_DATE + 45, (SELECT id FROM category WHERE name = 'VAT/Tax'),     NULL,                                              FALSE, NULL),
  (FALSE, 'Freelance Dev', 'Contract work',   1800, CURRENT_DATE + 20, (SELECT id FROM category WHERE name = 'Contractor'),  (SELECT id FROM project WHERE name = 'Mobile App'), FALSE, NULL);
