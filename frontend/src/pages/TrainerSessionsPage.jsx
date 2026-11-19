import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ErrorMessage } from '../components/ui.jsx';
import ParticipantsList from '../components/ParticipantsList.jsx';
import { formatDateTime, formatTime } from '../format.js';

export default function TrainerSessionsPage() {
  const [sessions, setSessions] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api('/sessions/mine').then(setSessions).catch(setError);
  }, []);

  return (
    <section>
      <h2>Moje prowadzone zajęcia</h2>
      <ErrorMessage error={error} />
      {sessions.length === 0 && <p className="muted">Brak zaplanowanych zajęć.</p>}
      {sessions.map((s) => (
        <article key={s.id} className="card">
          <div className="page-header">
            <div>
              <h3>{s.classType.name}</h3>
              <p className="muted">
                {formatDateTime(s.startsAt)} - {formatTime(s.endsAt)} · {s.room.name}
                {s.status === 'CANCELLED' && ' · ODWOŁANE'}
              </p>
            </div>
            <div className="session-side">
              <span className="badge ok">
                Zapisani: {s.enrolledCount}/{s.capacity}
              </span>
              {s.waitlistCount > 0 && <span className="muted small">Rezerwowi: {s.waitlistCount}</span>}
              <button className="secondary" onClick={() => setOpenId(openId === s.id ? null : s.id)}>
                {openId === s.id ? 'Ukryj listę' : 'Pokaż uczestników'}
              </button>
            </div>
          </div>
          {openId === s.id && <ParticipantsList sessionId={s.id} />}
        </article>
      ))}
    </section>
  );
}
