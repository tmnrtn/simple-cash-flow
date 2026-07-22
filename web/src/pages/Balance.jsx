import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';
import { formatCurrency } from '../format';

const empty = { balance_date: '', balance_amount: '' };

function fmt(date) {
  return date ? date.slice(0, 10) : '';
}

export default function Balance() {
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(null); // null | { mode: 'add'|'edit', data }
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const load = () => api.get('/api/balance').then(setRows);
  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setForm(empty);
    setError('');
    setModal({ mode: 'add' });
  }
  function openEdit(row) {
    setForm({ balance_date: fmt(row.balance_date), balance_amount: row.balance_amount });
    setError('');
    setModal({ mode: 'edit', id: row.id });
  }
  function close() {
    setModal(null);
  }

  async function save() {
    if (!form.balance_date || form.balance_amount === '') {
      setError('All fields required');
      return;
    }
    try {
      if (modal.mode === 'add') await api.post('/api/balance', form);
      else await api.put(`/api/balance/${modal.id}`, form);
      close();
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function del(id) {
    if (!confirm('Delete this balance entry?')) return;
    await api.delete(`/api/balance/${id}`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-800">Balance</h1>
        <button
          onClick={openAdd}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          + Add
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Amount</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{fmt(row.balance_date)}</td>
                <td className="px-4 py-3 text-right">{formatCurrency(row.balance_amount)}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(row)} className="text-blue-600 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => del(row.id)} className="text-red-500 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                  No entries
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add Balance' : 'Edit Balance'} onClose={close}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={form.balance_date}
                onChange={(e) => setForm((f) => ({ ...f, balance_date: e.target.value }))}
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                value={form.balance_amount}
                onChange={(e) => setForm((f) => ({ ...f, balance_amount: e.target.value }))}
                className="w-full border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
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
