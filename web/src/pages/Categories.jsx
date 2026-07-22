import React, { useEffect, useState } from 'react';
import { api } from '../api';
import Modal from '../components/Modal';

const empty = { name: '' };

export default function Categories() {
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');

  const load = () => api.get('/api/categories').then(setRows);
  useEffect(() => {
    load();
  }, []);

  function openAdd() {
    setForm(empty);
    setError('');
    setModal({ mode: 'add' });
  }
  function openEdit(row) {
    setForm({ name: row.name });
    setError('');
    setModal({ mode: 'edit', id: row.id });
  }
  function close() {
    setModal(null);
  }

  async function save() {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    try {
      if (modal.mode === 'add') await api.post('/api/categories', form);
      else await api.put(`/api/categories/${modal.id}`, form);
      close();
      load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function del(id) {
    if (!confirm('Delete this category? Transactions using it will lose their category.')) return;
    await api.delete(`/api/categories/${id}`);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-gray-800">Categories</h1>
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
              <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{row.name}</td>
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
                <td colSpan={2} className="px-4 py-6 text-center text-gray-400">
                  No categories
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Add Category' : 'Edit Category'} onClose={close}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ name: e.target.value })}
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
