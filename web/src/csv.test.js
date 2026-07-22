import { toCsv, parseCsv } from './csv';

test('round-trips simple rows', () => {
  const csv = toCsv(
    ['a', 'b'],
    [
      { a: '1', b: '2' },
      { a: '3', b: '4' },
    ]
  );
  expect(csv).toBe('a,b\n1,2\n3,4');
  const { headers, rows } = parseCsv(csv);
  expect(headers).toEqual(['a', 'b']);
  expect(rows).toEqual([
    { a: '1', b: '2' },
    { a: '3', b: '4' },
  ]);
});

test('quotes and unquotes fields with commas, quotes and newlines', () => {
  const csv = toCsv(['name', 'note'], [{ name: 'Acme, Inc', note: 'he said "hi"\nbye' }]);
  const { rows } = parseCsv(csv);
  expect(rows[0].name).toBe('Acme, Inc');
  expect(rows[0].note).toBe('he said "hi"\nbye');
});

test('ignores a trailing newline', () => {
  const { rows } = parseCsv('a,b\n1,2\n');
  expect(rows).toHaveLength(1);
});
