import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { ErrorMessage, SuccessMessage } from '../components/ui.jsx';
import { ENROLLMENT_LABELS, MEMBERSHIP_LABELS, MEMBERSHIP_STATUS_LABELS, formatDateTime } from '../format.js';

export default function MyEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState([]);
  const [membership, setMembership] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const [list, memberships] = await Promise.all([api('/enrollments/me'), api('/memberships/me')]);
      setEnrollments(list);
      setMembership(memberships);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(enrollment) {
    if (!window.confirm(`Zrezygnować z zajęć ${enrollment.session.classTypeName}?`)) {
      return;
    }
    setError(null);
    setSuccess('');
    try {
      await api(`/enrollments/${enrollment.id}/cancel`, { method: 'PATCH' });
      setSuccess('Zrezygnowano z zajęć. Miejsce otrzyma pierwsza osoba z listy rezerwowej.');
      await load();
    } catch (err) {
      setError(err);
    }
  }

  const now = new Date();
  const upcoming = enrollments
    .filter((e) => e.status !== 'CANCELLED' && new Date(e.session.startsAt) > now)
    .sort((a, b) => new Date(a.session.startsAt) - new Date(b.session.startsAt));
  const history = enrollments.filter((e) => !upcoming.includes(e));

  return (
    <section>
      <h2>Moje zajęcia</h2>

      <div className="card">
        <h3>Karnet</h3>
        {membership?.active ? (
          <p>
            <span className="badge ok">Aktywny</span> {MEMBERSHIP_LABELS[membership.active.type]}, ważny od{' '}
            {membership.active.startDate} do <strong>{membership.active.endDate}</strong>
          </p>
        ) : (
          <p>
            <span className="badge full">Brak aktywnego karnetu</span> Zapisy na zajęcia wymagają aktywnego karnetu.
          </p>
        )}
        {membership?.history.length > 1 && (
          <details>
            <summary>Historia karnetów</summary>
            <ul>
              {membership.history.map((m) => (
                <li key={m.id}>
                  {MEMBERSHIP_LABELS[m.type]}: {m.startDate} - {m.endDate} ({MEMBERSHIP_STATUS_LABELS[m.status]})
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <ErrorMessage error={error} />
      <SuccessMessage message={success} />

      <h3>Nadchodzące</h3>
      {upcoming.length === 0 && <p className="muted">Nie masz zaplanowanych zajęć.</p>}
      <table>
        <tbody>
          {upcoming.map((e) => (
            <tr key={e.id}>
              <td>
                <strong>{e.session.classTypeName}</strong>
                <div className="muted small">
                  {e.session.roomName} · {e.session.trainerName}
                </div>
              </td>
              <td>{formatDateTime(e.session.startsAt)}</td>
              <td>
                <span className={`badge ${e.status === 'ENROLLED' ? 'ok' : 'wait'}`}>
                  {ENROLLMENT_LABELS[e.status]}
                  {e.waitlistPosition ? ` #${e.waitlistPosition}` : ''}
                </span>
              </td>
              <td className="right">
                <button className="danger" onClick={() => cancel(e)}>
                  Zrezygnuj
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3>Historia</h3>
      {history.length === 0 && <p className="muted">Brak historii.</p>}
      <table>
        <tbody>
          {history.map((e) => (
            <tr key={e.id} className="dim">
              <td>{e.session.classTypeName}</td>
              <td>{formatDateTime(e.session.startsAt)}</td>
              <td>{e.session.status === 'CANCELLED' ? 'Zajęcia odwołane' : ENROLLMENT_LABELS[e.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
