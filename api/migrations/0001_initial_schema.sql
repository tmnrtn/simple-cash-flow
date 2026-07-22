CREATE TABLE category (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE project (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE balance (
  id SERIAL PRIMARY KEY,
  balance_date DATE,
  balance_amount REAL
);

CREATE TABLE transaction (
  id SERIAL PRIMARY KEY,
  is_income BOOLEAN NOT NULL,
  counterparty TEXT,
  description TEXT,
  amount REAL NOT NULL,
  due_date DATE NOT NULL,
  category INTEGER REFERENCES category(id),
  project_id INTEGER REFERENCES project(id),
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence TEXT
);

-- Generic starter expense categories. Edit or delete these from the
-- Categories page — they are only defaults, not required by the app.
INSERT INTO category (name) VALUES
  ('Rent/Office'),
  ('Contractor'),
  ('VAT/Tax'),
  ('Payroll');
