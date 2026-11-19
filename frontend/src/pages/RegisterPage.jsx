import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { ErrorMessage } from '../components/ui.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register(form);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={handleSubmit}>
        <h1>Rejestracja</h1>
        <p className="muted">Po rejestracji poproś recepcję o aktywację karnetu.</p>
        <ErrorMessage error={error} />
        <label>
          Imię
          <input required value={form.firstName} onChange={update('firstName')} />
        </label>
        <label>
          Nazwisko
          <input required value={form.lastName} onChange={update('lastName')} />
        </label>
        <label>
          E-mail
          <input type="email" required value={form.email} onChange={update('email')} />
        </label>
        <label>
          Hasło (min. 8 znaków)
          <input type="password" required minLength={8} value={form.password} onChange={update('password')} />
        </label>
        <button type="submit" disabled={busy}>
          {busy ? 'Zakładanie konta...' : 'Załóż konto'}
        </button>
        <p className="muted">
          Masz już konto? <Link to="/login">Zaloguj się</Link>
        </p>
      </form>
    </div>
  );
}
