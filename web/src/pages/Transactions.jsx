import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import { formatCurrency } from '../format';

const empty = {
  is_income: true,
  counterparty: '',
  description: '',
  amount: '',
  due_date: '',
  category: '',
  project_id: '',
  recurrence: '',
  recurrence_end: '',
};

const RECURRENCE_OPTIONS = [
  ['', 'None (one-off)'],
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
  ['quarterly', 'Quarterly'],
  ['annually', 'Annually'],
];

function fmt(date) {
  return date ? date.slice(0, 10) : '';
}

const categoryColours = {
  Payroll: 'bg-blue-100 text-blue-700',
  'VAT/Tax': 'bg-yellow-100 text-yellow-700',
  Contractor: 'bg-purple-100 text-purple-700',
  'Rent/Office': 'bg-green-100 text-green-700',
};

export default function Transactions() {
  const [rows, setRows] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('all');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const load = () => api.get('/api/transactions').then(setRows);
  useEffect(() => {
    load();
    api.get('/api/categories').then(setCategories);
    api.get('/api/projects').then(setProjects);
  }, []);

  function openAdd(defaultIncome = true) {
    setForm({ ...empty, is_income: defaultIncome });
    setError('');
    setModal({ mode: 'add' });
  }
  function openEdit(row) {
    setForm({
      is_income: row.is_income,
      counterparty: row.counterparty || '',
      description: row.description || '',
      amount: row.amount,
      due_date: fmt(row.due_date),
      category: row.category || '',
      project_id: row.project_id || '',
      recurrence: row.recurrence || '',
      recurrence_end: fmt(row.recurrence_end),
    });
    setError('');
    setModal({ mode: 'edit', id: row.id });
  }
  function close() {
    setModal(null);
  }

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function save() {
    if (!form.counterparty || !form.amount || !form.due_date) {
      setError('Counterparty, amount and due date are required');
      return;
    }
    try {
      if (modal.mode === 'add') await api.post('/api/transactions', form);
      else await api.put(`/api/transactions/${modal.id}`, form);
      close();
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function del(id) {
    if (!confirm('Delete this transaction?')) return;
    await api.delete(`/api/transactions/${id}`);
    load();
  }

  async function togglePaid(row) {
    await api.patch(`/api/transactions/${row.id}/paid`, { paid: !row.paid });
    load();
  }

  const visible =
    filter === 'all'
      ? rows
      : rows.filter((r) => (filter === 'income' ? r.is_income : !r.is_income));

  const field = (label, key, type = 'text') => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        step={type === 'number' ? '0.01' : undefined}
        value={form[key]}
        onChange={(e) => set(key, e.target.value)}
        className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold text-gray-800">Transactions</h1>
          <div className="flex rounded border overflow-hidden text-sm">
            {['all', 'income', 'expenses'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openAdd(true)}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            + Invoice
          </button>
          <button
            onClick={() => openAdd(false)}
            className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            + Bill
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Counterparty</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Description</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Due Date</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Category</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Project</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Recurs</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.map((row) => {
              const paid = row.paid && !row.recurrence;
              return (
                <tr key={row.id} className={paid ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${row.is_income ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    >
                      {row.is_income ? 'Invoice' : 'Bill'}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 font-medium ${paid ? 'line-through text-gray-400' : ''}`}
                  >
                    {row.counterparty}
                  </td>
                  <td
                    className={`px-4 py-3 ${paid ? 'line-through text-gray-400' : 'text-gray-500'}`}
                  >
                    {row.description}
                  </td>
                  <td
                    className={`px-4 py-3 text-right ${paid ? 'line-through text-gray-400' : row.is_income ? 'text-green-700' : 'text-red-700'}`}
                  >
                    {row.is_income ? '+' : '-'}
                    {formatCurrency(row.amount)}
                  </td>
                  <td className={`px-4 py-3 ${paid ? 'text-gray-400' : ''}`}>
                    {fmt(row.due_date)}
                  </td>
                  <td className="px-4 py-3">
                    {row.category_name ? (
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${categoryColours[row.category_name] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {row.category_name}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{row.project_name || ''}</td>
                  <td className="px-4 py-3">
                    {row.recurrence ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 capitalize">
                        {row.recurrence}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {!row.recurrence && (
                      <button
                        onClick={() => togglePaid(row)}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${row.paid ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                      >
                        {row.paid ? 'Paid' : 'Unpaid'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(row)} className="text-blue-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => del(row.id)} className="text-red-500 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-center text-gray-400">
                  No transactions
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal
          title={modal.mode === 'add' ? 'Add Transaction' : 'Edit Transaction'}
          onClose={close}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <div className="flex rounded border overflow-hidden text-sm">
                <button
                  onClick={() => set('is_income', true)}
                  className={`flex-1 py-1.5 ${form.is_income ? 'bg-green-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Invoice (income)
                </button>
                <button
                  onClick={() => set('is_income', false)}
                  className={`flex-1 py-1.5 ${!form.is_income ? 'bg-red-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                >
                  Bill (expense)
                </button>
              </div>
            </div>
            {field(form.is_income ? 'Client' : 'Supplier', 'counterparty')}
            {field('Description', 'description')}
            {field('Amount', 'amount', 'number')}
            {field('Due Date', 'due_date', 'date')}
            {!form.is_income && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                value={form.project_id}
                onChange={(e) => set('project_id', e.target.value)}
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">— None —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
              <select
                value={form.recurrence}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    recurrence: e.target.value,
                    // Drop a stale end date when reverting to one-off.
                    recurrence_end: e.target.value ? f.recurrence_end : '',
                  }))
                }
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {RECURRENCE_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {form.recurrence && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recurrence end <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={form.recurrence_end}
                  onChange={(e) => set('recurrence_end', e.target.value)}
                  className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={close}
                className="px-4 py-1.5 text-sm border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
