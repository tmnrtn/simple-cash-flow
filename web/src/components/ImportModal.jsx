import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { api } from '../api';
import { parseCsv } from '../csv';
import { TX_FIELDS, rowToPayload, autoMap } from '../transactionsCsv';

export default function ImportModal({ categories, projects, onClose, onImported }) {
  const [parsed, setParsed] = useState(null); // { headers, rows }
  const [mapping, setMapping] = useState({});
  const [result, setResult] = useState(null); // { imported, failed }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setResult(null);
    try {
      const { headers, rows } = parseCsv(await file.text());
      if (!headers.length || !rows.length) {
        setError('No rows found in that file.');
        setParsed(null);
        return;
      }
      setParsed({ headers, rows });
      setMapping(autoMap(headers));
    } catch {
      setError('Could not read that file as CSV.');
    }
  }

  // Validate every row against the current mapping (recomputed as mapping changes).
  const validated = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.map((row, i) => {
      const mapped = {};
      for (const f of TX_FIELDS) mapped[f.key] = mapping[f.key] ? row[mapping[f.key]] || '' : '';
      return { i, ...rowToPayload(mapped, { categories, projects }) };
    });
  }, [parsed, mapping, categories, projects]);

  const validCount = validated.filter((r) => r.payload).length;

  async function doImport() {
    setBusy(true);
    setError('');
    let imported = 0;
    let failed = 0;
    for (const r of validated) {
      if (!r.payload) {
        failed++;
        continue;
      }
      try {
        await api.post('/api/transactions', r.payload);
        imported++;
      } catch {
        failed++;
      }
    }
    setBusy(false);
    setResult({ imported, failed });
    if (imported > 0) onImported();
  }

  return (
    <Modal title="Import transactions from CSV" onClose={onClose}>
      {!parsed && !result && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Upload a CSV with a header row. Columns are matched automatically; you can adjust the
            mapping after selecting the file. Expected fields: type (income/expense), amount,
            due_date, and optionally counterparty, description, category, project, recurrence,
            recurrence_end.
          </p>
          <input type="file" accept=".csv,text/csv" onChange={onFile} className="text-sm" />
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      )}

      {parsed && !result && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Column mapping</h3>
            <div className="grid grid-cols-2 gap-2">
              {TX_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-gray-600">
                    {f.label}
                    {f.required && <span className="text-red-500"> *</span>}
                  </span>
                  <select
                    value={mapping[f.key] || ''}
                    onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value }))}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    <option value="">— skip —</option>
                    {parsed.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Preview — {validCount} of {validated.length} row(s) valid
            </h3>
            <div className="max-h-64 overflow-auto border rounded">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">Row</th>
                    <th className="px-2 py-1 text-left font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {validated.map((r) => (
                    <tr key={r.i} className={r.payload ? '' : 'bg-red-50'}>
                      <td className="px-2 py-1 text-gray-500">{r.i + 2}</td>
                      <td className="px-2 py-1">
                        {r.payload ? (
                          <span className="text-green-700">
                            {r.payload.is_income ? 'income' : 'expense'} · {r.payload.amount} ·{' '}
                            {r.payload.due_date}
                          </span>
                        ) : (
                          <span className="text-red-600">{r.error}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm border rounded hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={doImport}
              disabled={busy || validCount === 0}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {busy ? 'Importing…' : `Import ${validCount} valid row(s)`}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Imported <span className="font-semibold text-green-700">{result.imported}</span> row(s)
            {result.failed > 0 && (
              <>
                , skipped <span className="font-semibold text-red-600">{result.failed}</span>
              </>
            )}
            .
          </p>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
