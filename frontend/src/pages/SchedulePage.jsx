import { useCallback, useEffect, useState } from 'react';
import { api, toQuery } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { ErrorMessage, Modal, Pagination, SuccessMessage } from '../components/ui.jsx';
import SessionForm from '../components/SessionForm.jsx';
import ParticipantsList from '../components/ParticipantsList.jsx';
import { formatDateTime, formatTime, todayString } from '../format.js';

const emptyFilters = { dateFrom: todayString(), dateTo: '', classTypeId: '', trainerId: '' };

export default function SchedulePage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], meta: null });
  const [classTypes, setClassTypes] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [participantsOf, setParticipantsOf] = useState(null);
  const [myEnrollments, setMyEnrollments] = useState({});

  const isAdmin = user.role === 'ADMIN';
  const isMember = user.role === 'MEMBER';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessions, enrollments] = await Promise.all([
        api(`/sessions${toQuery({ ...filters, page, limit: 10 })}`),
        isMember ? api('/enrollments/me') : Promise.resolve([])
      ]);
      setResult(sessions);
      setMyEnrollments(
        Object.fromEntries(enrollments.filter((e) => e.status !== 'CANCELLED').map((e) => [e.sessionId, e]))
      );
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [filters, page, isMember]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([api('/class-types'), api('/trainers')])
      .then(([types, trainerList]) => {
        setClassTypes(types);
        setTrainers(trainerList);
      })
      .catch(setError);
  }, []);

  function changeFilter(field, value) {
    setPage(1);
    setFilters((prev) => ({ ...prev, [field]: value }));
  }

  async function runAction(action, message) {
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

  async function enroll(session) {
    setError(null);
    setSuccess('');
    try {
      const enrollment = await api('/enrollments', { method: 'POST', body: { sessionId: session.id } });
      setSuccess(
        enrollment.status === 'ENROLLED'
          ? `Zapisano na zajęcia ${session.classType.name}.`
          : `Brak wolnych miejsc - jesteś na liście rezerwowej (pozycja ${enrollment.waitlistPosition}).`
      );
      await load();
    } catch (err) {
      setError(err);
    }
  }

  function cancelSession(session) {
    if (window.confirm(`Odwołać zajęcia ${session.classType.name}? Uczestnicy dostaną e-mail.`)) {
      runAction(() => api(`/sessions/${session.id}/cancel`, { method: 'PATCH' }), 'Zajęcia zostały odwołane.');
    }
  }

  function deleteSession(session) {
    if (window.confirm(`Usunąć zajęcia ${session.classType.name}? Tej operacji nie można cofnąć.`)) {
      runAction(() => api(`/sessions/${session.id}`, { method: 'DELETE' }), 'Zajęcia zostały usunięte.');
    }
  }

  return (
    <section>
      <div className="page-header">
        <h2>Grafik zajęć</h2>
        {isAdmin && <button onClick={() => setEditing({})}>+ Dodaj zajęcia</button>}
      </div>

      <div className="card filters">
        <label>
          Od
          <input type="date" value={filters.dateFrom} onChange={(e) => changeFilter('dateFrom', e.target.value)} />
        </label>
        <label>
          Do
          <input type="date" value={filters.dateTo} onChange={(e) => changeFilter('dateTo', e.target.value)} />
        </label>
        <label>
          Typ zajęć
          <select value={filters.classTypeId} onChange={(e) => changeFilter('classTypeId', e.target.value)}>
            <option value="">Wszystkie</option>
            {classTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Trener
          <select value={filters.trainerId} onChange={(e) => changeFilter('trainerId', e.target.value)}>
            <option value="">Wszyscy</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.firstName} {t.lastName}
              </option>
            ))}
          </select>
        </label>
        <button
          className="secondary"
          onClick={() => {
            setPage(1);
            setFilters(emptyFilters);
          }}
        >
          Wyczyść
        </button>
      </div>

      <ErrorMessage error={error} />
      <SuccessMessage message={success} />

      {loading && <p className="muted">Ładowanie...</p>}
      {!loading && result.data.length === 0 && <p className="muted">Brak zajęć dla wybranych filtrów.</p>}

      <div className="session-list">
        {result.data.map((s) => (
          <article key={s.id} className="card session">
            <div className="session-main">
              <h3>{s.classType.name}</h3>
              <p>
                {formatDateTime(s.startsAt)} - {formatTime(s.endsAt)}
              </p>
              <p className="muted">
                {s.room.name} · trener: {s.trainer.firstName} {s.trainer.lastName}
              </p>
            </div>
            <div className="session-side">
              <span className={`badge ${s.freeSpots > 0 ? 'ok' : 'full'}`}>
                {s.freeSpots > 0 ? `Wolne miejsca: ${s.freeSpots}/${s.capacity}` : `Brak miejsc (${s.capacity})`}
              </span>
              {s.waitlistCount > 0 && <span className="muted small">Lista rezerwowa: {s.waitlistCount}</span>}
              <div className="actions">
                {isMember && myEnrollments[s.id] && (
                  <span className={`badge ${myEnrollments[s.id].status === 'ENROLLED' ? 'ok' : 'wait'}`}>
                    {myEnrollments[s.id].status === 'ENROLLED'
                      ? 'Jesteś zapisany'
                      : `Jesteś na liście rezerwowej (#${myEnrollments[s.id].waitlistPosition})`}
                  </span>
                )}
                {isMember && !myEnrollments[s.id] && (
                  <button onClick={() => enroll(s)}>{s.freeSpots > 0 ? 'Zapisz się' : 'Na listę rezerwową'}</button>
                )}
                {isAdmin && (
                  <>
                    <button className="secondary" onClick={() => setParticipantsOf(s)}>
                      Uczestnicy
                    </button>
                    <button className="secondary" onClick={() => setEditing(s)}>
                      Edytuj
                    </button>
                    <button className="warning" onClick={() => cancelSession(s)}>
                      Odwołaj
                    </button>
                    <button className="danger" onClick={() => deleteSession(s)}>
                      Usuń
                    </button>
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      <Pagination meta={result.meta} onChange={setPage} />

      {editing && (
        <Modal title={editing.id ? 'Edycja zajęć' : 'Nowe zajęcia'} onClose={() => setEditing(null)}>
          <SessionForm
            session={editing.id ? editing : null}
            classTypes={classTypes}
            trainers={trainers}
            onSaved={() => {
              setEditing(null);
              setSuccess(editing.id ? 'Zapisano zmiany.' : 'Dodano zajęcia do grafiku.');
              load();
            }}
          />
        </Modal>
      )}

      {participantsOf && (
        <Modal title={`Uczestnicy: ${participantsOf.classType.name}`} onClose={() => setParticipantsOf(null)}>
          <ParticipantsList sessionId={participantsOf.id} />
        </Modal>
      )}
    </section>
  );
}
