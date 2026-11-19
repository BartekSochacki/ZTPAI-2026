import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ErrorMessage } from './ui.jsx';
import { fromLocalInput, toLocalInput } from '../format.js';

function initialForm(session) {
  if (!session) {
    return { classTypeId: '', trainerId: '', roomId: '', startsAt: '', endsAt: '', capacity: 10 };
  }
  return {
    classTypeId: session.classType.id,
    trainerId: session.trainer.id,
    roomId: session.room.id,
    startsAt: toLocalInput(session.startsAt),
    endsAt: toLocalInput(session.endsAt),
    capacity: session.capacity
  };
}

export default function SessionForm({ session, classTypes, trainers, onSaved }) {
  const [form, setForm] = useState(() => initialForm(session));
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/rooms').then(setRooms).catch(setError);
  }, []);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const body = {
      classTypeId: Number(form.classTypeId),
      trainerId: Number(form.trainerId),
      roomId: Number(form.roomId),
      startsAt: fromLocalInput(form.startsAt),
      endsAt: fromLocalInput(form.endsAt),
      capacity: Number(form.capacity)
    };
    try {
      if (session) {
        await api(`/sessions/${session.id}`, { method: 'PUT', body: { ...body, version: session.version } });
      } else {
        await api('/sessions', { method: 'POST', body });
      }
      onSaved();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const selectedRoom = rooms.find((r) => r.id === Number(form.roomId));

  return (
    <form className="form" onSubmit={handleSubmit}>
      <ErrorMessage error={error} />
      <label>
        Typ zajęć
        <select required value={form.classTypeId} onChange={update('classTypeId')}>
          <option value="">Wybierz...</option>
          {classTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Trener
        <select required value={form.trainerId} onChange={update('trainerId')}>
          <option value="">Wybierz...</option>
          {trainers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.firstName} {t.lastName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sala
        <select required value={form.roomId} onChange={update('roomId')}>
          <option value="">Wybierz...</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} (max {r.capacity})
            </option>
          ))}
        </select>
      </label>
      <div className="row">
        <label>
          Początek
          <input type="datetime-local" required value={form.startsAt} onChange={update('startsAt')} />
        </label>
        <label>
          Koniec
          <input type="datetime-local" required value={form.endsAt} onChange={update('endsAt')} />
        </label>
      </div>
      <label>
        Limit miejsc {selectedRoom && <small className="muted">(sala mieści {selectedRoom.capacity})</small>}
        <input type="number" min={1} required value={form.capacity} onChange={update('capacity')} />
      </label>
      <button type="submit" disabled={busy}>
        {busy ? 'Zapisywanie...' : 'Zapisz'}
      </button>
    </form>
  );
}
