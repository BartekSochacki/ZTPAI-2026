import { useCallback, useEffect, useState } from 'react';
import { api, toQuery } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { ErrorMessage, Modal, Pagination, SuccessMessage } from '../components/ui.jsx';
import { MEMBERSHIP_LABELS, ROLE_LABELS, todayString } from '../format.js';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState({ search: '', role: '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], meta: null });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [membershipFor, setMembershipFor] = useState(null);
  const [membershipForm, setMembershipForm] = useState({ type: 'MONTHLY', startDate: todayString() });
  const [membershipError, setMembershipError] = useState(null);

  const load = useCallback(async () => {
    try {
      setResult(await api(`/users${toQuery({ ...query, page, limit: 10 })}`));
    } catch (err) {
      setError(err);
    }
  }, [query, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action, message) {
    setError(null);
    setSuccess('');
    try {
      await action();
      setSuccess(message);
      await load();
    } catch (err) {
      setError(err);
    }
  }

  function changeRole(user, role) {
    run(() => api(`/users/${user.id}/role`, { method: 'PATCH', body: { role } }), `Zmieniono rolę: ${user.email}.`);
  }

  function remove(user) {
    if (window.confirm(`Usunąć konto ${user.email}? Tej operacji nie można cofnąć.`)) {
      run(() => api(`/users/${user.id}`, { method: 'DELETE' }), 'Usunięto użytkownika.');
    }
  }

  async function addMembership(e) {
    e.preventDefault();
    setMembershipError(null);
    try {
      await api('/memberships', { method: 'POST', body: { userId: membershipFor.id, ...membershipForm } });
      setSuccess(`Przyznano karnet dla ${membershipFor.email}.`);
      setMembershipFor(null);
    } catch (err) {
      setMembershipError(err);
    }
  }

  return (
    <section>
      <h2>Użytkownicy</h2>
      <div className="card filters">
        <label>
          Szukaj
          <input
            placeholder="e-mail, imię, nazwisko"
            value={query.search}
            onChange={(e) => {
              setPage(1);
              setQuery({ ...query, search: e.target.value });
            }}
          />
        </label>
        <label>
          Rola
          <select
            value={query.role}
            onChange={(e) => {
              setPage(1);
              setQuery({ ...query, role: e.target.value });
            }}
          >
            <option value="">Wszystkie</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
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
            <th>Imię i nazwisko</th>
            <th>E-mail</th>
            <th>Rola</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {result.data.map((u) => (
            <tr key={u.id}>
              <td>
                {u.firstName} {u.lastName}
              </td>
              <td>{u.email}</td>
              <td>
                <select value={u.role} disabled={u.id === currentUser.id} onChange={(e) => changeRole(u, e.target.value)}>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="right nowrap">
                {u.role === 'MEMBER' && (
                  <button
                    className="secondary"
                    onClick={() => {
                      setMembershipError(null);
                      setMembershipFor(u);
                    }}
                  >
                    + Karnet
                  </button>
                )}{' '}
                {u.id !== currentUser.id && (
                  <button className="danger" onClick={() => remove(u)}>
                    Usuń
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination meta={result.meta} onChange={setPage} />

      {membershipFor && (
        <Modal title={`Nowy karnet: ${membershipFor.firstName} ${membershipFor.lastName}`} onClose={() => setMembershipFor(null)}>
          <form className="form" onSubmit={addMembership}>
            <ErrorMessage error={membershipError} />
            <label>
              Rodzaj
              <select value={membershipForm.type} onChange={(e) => setMembershipForm({ ...membershipForm, type: e.target.value })}>
                {Object.entries(MEMBERSHIP_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Data rozpoczęcia
              <input
                type="date"
                required
                value={membershipForm.startDate}
                onChange={(e) => setMembershipForm({ ...membershipForm, startDate: e.target.value })}
              />
            </label>
            <button type="submit">Przyznaj karnet</button>
          </form>
        </Modal>
      )}
    </section>
  );
}
