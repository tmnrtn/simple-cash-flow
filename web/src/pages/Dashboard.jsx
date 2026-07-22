import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { api } from '../api';

function fmt(date) { return date ? date.slice(0, 10) : ''; }
function gbp(n) { return `£${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`; }

function pivot(rows, labelKey, weekCount, allWeekEnds) {
  const names = [...new Set(rows.map(r => r[labelKey]))].sort();
  const weeks = Array.from({ length: weekCount }, (_, i) => i + 1);

  const lookup = {};
  rows.forEach(r => {
    const key = `${r.week_number}__${r[labelKey]}`;
    lookup[key] = (lookup[key] || 0) + Number(r.amount);
  });

  const weekEnds = allWeekEnds;

  const rowTotals = {};
  names.forEach(name => {
    rowTotals[name] = weeks.reduce((s, w) => s + (lookup[`${w}__${name}`] || 0), 0);
  });
  const grandTotal = weeks.reduce((s, w) => s + names.reduce((ss, n) => ss + (lookup[`${w}__${n}`] || 0), 0), 0);
  const colTotals = weeks.reduce((acc, w) => {
    acc[w] = names.reduce((s, n) => s + (lookup[`${w}__${n}`] || 0), 0);
    return acc;
  }, {});

  return { names, weeks, lookup, weekEnds, rowTotals, grandTotal, colTotals };
}

function PivotTable({ title, rows, labelKey, weekCount, allWeekEnds }) {
  if (!rows.length) return null;
  const { names, weeks, lookup, weekEnds, rowTotals, grandTotal, colTotals } = pivot(rows, labelKey, weekCount, allWeekEnds);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h2 className="font-semibold text-gray-700">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-28">Name</th>
              {weeks.map(w => (
                <th key={w} className="px-3 py-2 text-right font-medium text-gray-600 min-w-24">{weekEnds[w] || `Wk ${w}`}</th>
              ))}
              <th className="px-3 py-2 text-right font-medium text-gray-600 min-w-24">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {names.map(name => (
              <tr key={name} className="hover:bg-gray-50">
                <td className="px-3 py-2 sticky left-0 bg-white font-medium">{name}</td>
                {weeks.map(w => {
                  const v = lookup[`${w}__${name}`];
                  return <td key={w} className="px-3 py-2 text-right">{v ? gbp(v) : ''}</td>;
                })}
                <td className="px-3 py-2 text-right font-medium">{gbp(rowTotals[name])}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold border-t">
              <td className="px-3 py-2 sticky left-0 bg-gray-50">Grand Total</td>
              {weeks.map(w => (
                <td key={w} className="px-3 py-2 text-right">{colTotals[w] ? gbp(colTotals[w]) : ''}</td>
              ))}
              <td className="px-3 py-2 text-right">{gbp(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BalanceTable({ balances }) {
  if (!balances.length) return null;
  const weeks = balances.map(b => b.week_number);
  const rows = [
    { label: 'Start Balance', key: 'start_balance' },
    { label: 'Net Change', key: 'net_change' },
    { label: 'End Balance', key: 'end_balance' },
  ];

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h2 className="font-semibold text-gray-700">13-Week Summary</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="text-xs w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-gray-600 sticky left-0 bg-gray-50 min-w-28" />
              {balances.map(b => (
                <th key={b.week_number} className="px-3 py-2 text-right font-medium text-gray-600 min-w-24">{fmt(b.week_end)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map(({ label, key }) => (
              <tr key={key}>
                <td className="px-3 py-2 sticky left-0 bg-white font-medium text-gray-700">{label}</td>
                {balances.map(b => {
                  const v = Number(b[key]);
                  const neg = v < 0;
                  return (
                    <td key={b.week_number} className={`px-3 py-2 text-right ${neg ? 'bg-red-100 text-red-700' : ''}`}>
                      {gbp(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="bg-white border rounded shadow px-3 py-2 text-sm">
      <p className="text-gray-500">{label}</p>
      <p className={v < 0 ? 'text-red-600 font-semibold' : 'text-blue-600 font-semibold'}>{gbp(v)}</p>
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/dashboard')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400 py-8 text-center">Loading...</p>;
  if (error) return <p className="text-red-500 py-8 text-center">{error}</p>;
  if (!data) return null;

  const { balances, receipts, payments } = data;

  if (!balances.length) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <h1 className="text-xl font-semibold text-gray-800 mb-2">No forecast yet</h1>
        <p className="text-gray-500 mb-6">
          The 13-week projection starts from your latest balance. Add your current
          bank balance to begin forecasting.
        </p>
        <Link to="/balance" className="inline-block bg-blue-900 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-800">
          Add a balance
        </Link>
      </div>
    );
  }

  const chartData = balances.map(b => ({ week: fmt(b.week_end), balance: Number(b.end_balance) }));
  const allWeekEnds = Object.fromEntries(balances.map(b => [b.week_number, fmt(b.week_end)]));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-800">Cash Flow</h1>

      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-gray-700 mb-4">End Balance by Week</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="week" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `£${(v / 1000).toFixed(1)}k`} />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 2" />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="balance"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4, fill: '#3b82f6' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <BalanceTable balances={balances} />
      <PivotTable title="Receipts" rows={receipts} labelKey="name" weekCount={13} allWeekEnds={allWeekEnds} />
      <PivotTable title="Payments" rows={payments} labelKey="name" weekCount={13} allWeekEnds={allWeekEnds} />
    </div>
  );
}
