import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { ErrorMessage, Modal, SuccessMessage } from '../components/ui.jsx';

function emptyItem(fields) {
  return Object.fromEntries(fields.map((f) => [f.name, '']));
}

export default function SimpleCrudPage({ title, resource, fields }) {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyItem(fields));
  const [error, setError] = useState(null);
  const [formError, setFormError] = useState(null);
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      setItems(await api(resource));
    } catch (err) {
      setError(err);
    }
  }, [resource]);

  useEffect(() => {
    load();
  }, [load]);

  function openForm(item) {
    setFormError(null);
    setEditing(item || {});
    setForm(item ? Object.fromEntries(fields.map((f) => [f.name, item[f.name] ?? ''])) : emptyItem(fields));
  }

  async function save(e) {
    e.preventDefault();
    setFormError(null);
    const body = Object.fromEntries(
      fields.map((f) => [f.name, f.type === 'number' ? Number(form[f.name]) : form[f.name] || null])
    );
    try {
      if (editing.id) {
        await api(`${resource}/${editing.id}`, { method: 'PUT', body });
      } else {
        await api(resource, { method: 'POST', body });
      }
      setSuccess(editing.id ? 'Zapisano zmiany.' : 'Dodano rekord.');
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err);
    }
  }

  async function remove(item) {
    if (!window.confirm(`Usunąć "${item.name}"?`)) {
      return;
    }
    setError(null);
    setSuccess('');
    try {
      await api(`${resource}/${item.id}`, { method: 'DELETE' });
      setSuccess('Usunięto rekord.');
      await load();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <section>
      <div className="page-header">
        <h2>{title}</h2>
        <button onClick={() => openForm(null)}>+ Dodaj</button>
      </div>
      <ErrorMessage error={error} />
      <SuccessMessage message={success} />
      <table>
        <thead>
          <tr>
            {fields.map((f) => (
              <th key={f.name}>{f.label}</th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              {fields.map((f) => (
                <td key={f.name}>{item[f.name]}</td>
              ))}
              <td className="right nowrap">
                <button className="secondary" onClick={() => openForm(item)}>
                  Edytuj
                </button>{' '}
                <button className="danger" onClick={() => remove(item)}>
                  Usuń
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editing && (
        <Modal title={editing.id ? 'Edycja' : 'Nowy rekord'} onClose={() => setEditing(null)}>
          <form className="form" onSubmit={save}>
            <ErrorMessage error={formError} />
            {fields.map((f) => (
              <label key={f.name}>
                {f.label}
                {f.type === 'textarea' ? (
                  <textarea value={form[f.name]} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                ) : (
                  <input
                    type={f.type}
                    min={f.min}
                    required={f.required}
                    value={form[f.name]}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                )}
              </label>
            ))}
            <button type="submit">Zapisz</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
