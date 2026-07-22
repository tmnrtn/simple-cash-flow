import { toCsv } from './csv';

// Canonical CSV columns for a transaction. Export writes these; import maps
// arbitrary CSV headers onto them.
export const TX_FIELDS = [
  { key: 'type', label: 'Type (income/expense)', required: true },
  { key: 'counterparty', label: 'Counterparty' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount', required: true },
  { key: 'due_date', label: 'Due date' },
  { key: 'category', label: 'Category' },
  { key: 'project', label: 'Project' },
  { key: 'recurrence', label: 'Recurrence' },
  { key: 'recurrence_end', label: 'Recurrence end' },
];

const RECURRENCES = ['weekly', 'monthly', 'quarterly', 'annually'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function transactionsToCsv(rows, fmtDate) {
  const headers = TX_FIELDS.map((f) => f.key);
  return toCsv(
    headers,
    rows.map((r) => ({
      type: r.is_income ? 'income' : 'expense',
      counterparty: r.counterparty || '',
      description: r.description || '',
      amount: r.amount,
      due_date: fmtDate(r.due_date),
      category: r.category_name || '',
      project: r.project_name || '',
      recurrence: r.recurrence || '',
      recurrence_end: fmtDate(r.recurrence_end),
    }))
  );
}

// Turn a mapped CSV row (keyed by TX_FIELDS keys) into a validated API payload.
// Returns { payload } on success or { error } with a human-readable message.
export function rowToPayload(mapped, { categories = [], projects = [] } = {}) {
  const type = (mapped.type || '').toLowerCase();
  let is_income;
  if (['income', 'true', 'in', '1'].includes(type)) is_income = true;
  else if (['expense', 'false', 'out', '0'].includes(type)) is_income = false;
  else return { error: `type must be income or expense (got "${mapped.type || ''}")` };

  const amount = Number(mapped.amount);
  if (!Number.isFinite(amount) || amount <= 0) return { error: 'amount must be a number > 0' };

  const due_date = (mapped.due_date || '').slice(0, 10);
  if (!DATE_RE.test(due_date)) return { error: 'due_date must be YYYY-MM-DD' };

  const byName = (list, name) => list.find((x) => x.name.toLowerCase() === name.toLowerCase());

  let category = null;
  if (mapped.category) {
    const match = byName(categories, mapped.category);
    if (!match) return { error: `unknown category "${mapped.category}"` };
    category = match.id;
  }

  let project_id = null;
  if (mapped.project) {
    const match = byName(projects, mapped.project);
    if (!match) return { error: `unknown project "${mapped.project}"` };
    project_id = match.id;
  }

  let recurrence = null;
  if (mapped.recurrence) {
    const r = mapped.recurrence.toLowerCase();
    if (!RECURRENCES.includes(r)) return { error: `invalid recurrence "${mapped.recurrence}"` };
    recurrence = r;
  }

  let recurrence_end = null;
  if (mapped.recurrence_end) {
    recurrence_end = mapped.recurrence_end.slice(0, 10);
    if (!DATE_RE.test(recurrence_end)) return { error: 'recurrence_end must be YYYY-MM-DD' };
    if (!recurrence) return { error: 'recurrence_end requires a recurrence' };
  }

  return {
    payload: {
      is_income,
      counterparty: mapped.counterparty || null,
      description: mapped.description || null,
      amount,
      due_date,
      category,
      project_id,
      recurrence,
      recurrence_end,
    },
  };
}

// Best-effort mapping of CSV headers onto TX_FIELDS by normalised name/synonyms.
export function autoMap(headers) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z]/g, '');
  const byNorm = {};
  headers.forEach((h) => {
    byNorm[norm(h)] = h;
  });
  const synonyms = {
    type: ['type', 'isincome', 'incomeexpense', 'direction'],
    counterparty: ['counterparty', 'client', 'supplier', 'name', 'payee'],
    description: ['description', 'desc', 'notes', 'memo'],
    amount: ['amount', 'value', 'total'],
    due_date: ['duedate', 'date', 'due'],
    category: ['category'],
    project: ['project'],
    recurrence: ['recurrence', 'recurring', 'frequency'],
    recurrence_end: ['recurrenceend', 'enddate', 'until'],
  };
  const mapping = {};
  for (const f of TX_FIELDS) {
    const cands = synonyms[f.key] || [f.key];
    mapping[f.key] = cands.map((c) => byNorm[c]).find(Boolean) || '';
  }
  return mapping;
}
