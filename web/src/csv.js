// Minimal CSV parser/serializer (RFC 4180-ish: quoted fields, "" escapes, and
// commas/newlines inside quotes). Enough for the transactions/balances export
// and import.

export function toCsv(headers, rows) {
  const esc = (val) => {
    const s = val === null || val === undefined ? '' : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.map(esc).join(',')];
  for (const row of rows) lines.push(headers.map((h) => esc(row[h])).join(','));
  return lines.join('\n');
}

// Returns { headers: string[], rows: Array<Record<string,string>> }.
export function parseCsv(text) {
  const records = [];
  let field = '';
  let record = [];
  let inQuotes = false;

  const endField = () => {
    record.push(field);
    field = '';
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      endField();
    } else if (c === '\n') {
      endRecord();
    } else if (c !== '\r') {
      field += c;
    }
  }
  if (field !== '' || record.length > 0) endRecord();

  const rows = records.filter((r) => !(r.length === 1 && r[0].trim() === ''));
  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0].map((h) => h.trim());
  const data = rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? '').trim();
    });
    return obj;
  });
  return { headers, rows: data };
}

export function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
