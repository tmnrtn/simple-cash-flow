import { setCurrencyConfig, formatCurrency, formatCurrencyCompact } from './format';

test('formats amounts with the configured currency and locale', () => {
  setCurrencyConfig({ currency: 'USD', locale: 'en-US' });
  expect(formatCurrency(1234.5)).toBe('$1,234.50');
});

test('defaults to GBP when unconfigured', () => {
  setCurrencyConfig({});
  expect(formatCurrency(10)).toMatch(/£10\.00/);
});

test('compact form is used for axis labels', () => {
  setCurrencyConfig({ currency: 'USD', locale: 'en-US' });
  expect(formatCurrencyCompact(18000)).toMatch(/\$18(\.0)?K/i);
});
