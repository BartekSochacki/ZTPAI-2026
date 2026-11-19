import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ErrorMessage } from './ui.jsx';
import { ENROLLMENT_LABELS } from '../format.js';

export default function ParticipantsList({ sessionId }) {
  const [participants, setParticipants] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api(`/sessions/${sessionId}/participants`).then(setParticipants).catch(setError);
  }, [sessionId]);

  if (error) {
    return <ErrorMessage error={error} />;
  }
  if (!participants) {
    return <p className="muted">Ładowanie...</p>;
  }
  if (participants.length === 0) {
    return <p className="muted">Nikt jeszcze się nie zapisał.</p>;
  }

  return (
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Imię i nazwisko</th>
          <th>E-mail</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {participants.map((p, index) => (
          <tr key={p.enrollmentId}>
            <td>{index + 1}</td>
            <td>
              {p.firstName} {p.lastName}
            </td>
            <td>{p.email}</td>
            <td>
              <span className={`badge ${p.status === 'ENROLLED' ? 'ok' : 'wait'}`}>{ENROLLMENT_LABELS[p.status]}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
