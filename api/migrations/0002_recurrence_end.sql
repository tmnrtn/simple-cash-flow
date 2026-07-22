-- Optional end date for recurring transactions: past this date the recurrence
-- stops being projected. NULL means it recurs indefinitely.
ALTER TABLE transaction ADD COLUMN recurrence_end DATE;
