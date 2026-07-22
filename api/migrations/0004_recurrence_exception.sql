-- A cleared (paid or skipped) single occurrence of a recurring transaction.
-- Excepted occurrences are excluded from the dashboard projection and skipped
-- when computing a recurring row's next due date.
CREATE TABLE recurrence_exception (
  transaction_id INTEGER NOT NULL REFERENCES transaction(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  PRIMARY KEY (transaction_id, occurrence_date)
);
