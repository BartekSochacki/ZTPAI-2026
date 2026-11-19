import { useCallback, useEffect, useState } from 'react';
import { api, toQuery } from '../api.js';
import { ErrorMessage, Pagination, SuccessMessage } from '../components/ui.jsx';
import { MEMBERSHIP_LABELS, MEMBERSHIP_STATUS_LABELS } from '../format.js';

export default function MembershipsPage() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], meta: null });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      setResult(await api(`/memberships${toQuery({ status, page, limit: 10 })}`));
    } catch (err) {
      setError(err);
    }
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(membership) {
    if (!window.confirm('Anulować ten karnet?')) {
      return;
    }
    setError(null);
    setSuccess('');
    try {
      await api(`/memberships/${membership.id}/cancel`, { method: 'PATCH' });
      setSuccess('Karnet anulowany.');
      await load();
    } catch (err) {
      setError(err);
    }
  }

  return (
    <section>
      <h2>Karnety</h2>
      <p className="muted">Nowy karnet przyznasz w zakładce Użytkownicy.</p>
      <div className="card filters">
        <label>
          Status
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">Wszystkie</option>
            {Object.entries(MEMBERSHIP_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ErrorMessage error={error} />
      <SuccessMessage message={success} />
      <table>
        <thead>
          <tr>
            <th>Członek</th>
            <th>Rodzaj</th>
            <th>Ważność</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {result.data.map((m) => (
            <tr key={m.id}>
              <td>
                {m.user.firstName} {m.user.lastName}
                <div className="muted small">{m.user.email}</div>
              </td>
              <td>{MEMBERSHIP_LABELS[m.type]}</td>
              <td>
                {m.startDate} - {m.endDate}
              </td>
              <td>
                <span className={`badge ${m.status === 'ACTIVE' ? 'ok' : 'full'}`}>{MEMBERSHIP_STATUS_LABELS[m.status]}</span>
              </td>
              <td className="right">
                {m.status === 'ACTIVE' && (
                  <button className="danger" onClick={() => cancel(m)}>
                    Anuluj
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination meta={result.meta} onChange={setPage} />
    </section>
  );
}
