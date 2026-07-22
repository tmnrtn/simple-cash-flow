// Currency formatting, configured once at startup from the API's /api/config
// (which reads the CURRENCY / LOCALE env vars). An undefined locale makes
// Intl fall back to the browser's locale.

let config = { currency: 'GBP', locale: undefined };

export function setCurrencyConfig(next = {}) {
  config = {
    currency: next.currency || 'GBP',
    locale: next.locale || undefined,
  };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

// Compact form for chart axes, e.g. "£18K".
export function formatCurrencyCompact(value) {
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);
}
