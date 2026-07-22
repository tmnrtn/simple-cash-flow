import { rowToPayload, autoMap, transactionsToCsv, TX_FIELDS } from './transactionsCsv';

const categories = [{ id: 5, name: 'Payroll' }];
const projects = [{ id: 9, name: 'Mobile App' }];

test('a valid row maps to an API payload', () => {
  const { payload, error } = rowToPayload(
    {
      type: 'expense',
      amount: '100',
      due_date: '2026-02-01',
      category: 'Payroll',
      recurrence: 'monthly',
    },
    { categories, projects }
  );
  expect(error).toBeUndefined();
  expect(payload).toMatchObject({
    is_income: false,
    amount: 100,
    category: 5,
    recurrence: 'monthly',
  });
});

test('rejects a bad amount', () => {
  const { error } = rowToPayload({ type: 'income', amount: 'x', due_date: '2026-02-01' }, {});
  expect(error).toMatch(/amount/);
});

test('rejects an unknown category name', () => {
  const { error } = rowToPayload(
    { type: 'expense', amount: '1', due_date: '2026-02-01', category: 'Nope' },
    { categories }
  );
  expect(error).toMatch(/unknown category/i);
});

test('recurrence_end requires a recurrence', () => {
  const { error } = rowToPayload(
    { type: 'income', amount: '1', due_date: '2026-02-01', recurrence_end: '2026-03-01' },
    {}
  );
  expect(error).toMatch(/recurrence_end requires/i);
});

test('autoMap matches headers by synonym', () => {
  const m = autoMap(['Date', 'Client', 'Value', 'Type']);
  expect(m.due_date).toBe('Date');
  expect(m.counterparty).toBe('Client');
  expect(m.amount).toBe('Value');
  expect(m.type).toBe('Type');
});

test('export writes the canonical columns and round-trips type/names', () => {
  const csv = transactionsToCsv(
    [
      {
        is_income: true,
        counterparty: 'Acme',
        amount: 100,
        due_date: '2026-02-01T00:00:00Z',
        category_name: 'Payroll',
        recurrence: 'monthly',
        recurrence_end: null,
      },
    ],
    (d) => (d ? String(d).slice(0, 10) : '')
  );
  const lines = csv.split('\n');
  expect(lines[0]).toBe(TX_FIELDS.map((f) => f.key).join(','));
  expect(lines[1]).toContain('income');
  expect(lines[1]).toContain('Acme');
  expect(lines[1]).toContain('2026-02-01');
});
