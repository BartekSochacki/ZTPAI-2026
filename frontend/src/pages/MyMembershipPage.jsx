import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { ErrorMessage, Modal, SuccessMessage } from '../components/ui.jsx';
import { MEMBERSHIP_LABELS, MEMBERSHIP_STATUS_LABELS, PAYMENT_STATUS_LABELS, formatDateTime, formatPrice } from '../format.js';

const emptyCard = { holder: '', number: '', expiry: '', cvc: '' };

function formatCardNumber(value) {
  return value
    .replace(/\D/g, '')
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function PaymentForm({ plan, extending, onPaid }) {
  const [card, setCard] = useState(emptyCard);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  function update(field, format) {
    return (e) => setCard((prev) => ({ ...prev, [field]: format ? format(e.target.value) : e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await api('/memberships/purchase', { method: 'POST', body: { type: plan.type, card } });
      onPaid(result);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <p>
        Karnet <strong>{MEMBERSHIP_LABELS[plan.type]}</strong> ({plan.days} dni) za <strong>{formatPrice(plan.price)}</strong>
        {extending && <span className="muted"> – zacznie się dzień po końcu obecnego karnetu.</span>}
      </p>
      <div className="alert info">
        Płatność testowa, żadne pieniądze nie są pobierane. Karta <strong>4242 4242 4242 4242</strong> przechodzi, karta{' '}
        <strong>4000 0000 0000 0002</strong> zostaje odrzucona. Data ważności: dowolna przyszła, CVC: dowolne 3 cyfry.
      </div>
      <ErrorMessage error={error} />
      <label>
        Imię i nazwisko na karcie
        <input required autoComplete="off" value={card.holder} onChange={update('holder')} />
      </label>
      <label>
        Numer karty
        <input required inputMode="numeric" autoComplete="off" placeholder="4242 4242 4242 4242" value={card.number} onChange={update('number', formatCardNumber)} />
      </label>
      <div className="row">
        <label>
          Ważna do
          <input required inputMode="numeric" autoComplete="off" placeholder="MM/RR" value={card.expiry} onChange={update('expiry', formatExpiry)} />
        </label>
        <label>
          CVC
          <input required inputMode="numeric" autoComplete="off" placeholder="123" maxLength={4} value={card.cvc} onChange={update('cvc', (v) => v.replace(/\D/g, ''))} />
        </label>
      </div>
      <button type="submit" disabled={busy}>
        {busy ? 'Przetwarzanie płatności...' : `Zapłać ${formatPrice(plan.price)}`}
      </button>
    </form>
  );
}

export default function MyMembershipPage() {
  const [membership, setMembership] = useState(null);
  const [plans, setPlans] = useState([]);
  const [payments, setPayments] = useState([]);
  const [buying, setBuying] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    try {
      const [mine, planList, paymentList] = await Promise.all([
        api('/memberships/me'),
        api('/memberships/plans'),
        api('/payments/me')
      ]);
      setMembership(mine);
      setPlans(planList);
      setPayments(paymentList);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasActive = Boolean(membership?.active);

  return (
    <section>
      <h2>Mój karnet</h2>

      <ErrorMessage error={error} />
      <SuccessMessage message={success} />

      <div className="card">
        <h3>Aktualny karnet</h3>
        {hasActive ? (
          <p>
            <span className="badge ok">Aktywny</span> {MEMBERSHIP_LABELS[membership.active.type]}, ważny od{' '}
            {membership.active.startDate} do <strong>{membership.active.endDate}</strong>
          </p>
        ) : (
          <p>
            <span className="badge full">Brak aktywnego karnetu</span> Kup karnet poniżej, żeby zapisywać się na zajęcia.
          </p>
        )}
      </div>

      <h3>{hasActive ? 'Przedłuż karnet' : 'Kup karnet'}</h3>
      <div className="plans">
        {plans.map((plan) => (
          <article key={plan.type} className="card plan">
            <h3>{MEMBERSHIP_LABELS[plan.type]}</h3>
            <p className="price">{formatPrice(plan.price)}</p>
            <p className="muted">{plan.days} dni wejść na wszystkie zajęcia</p>
            <button onClick={() => setBuying(plan)}>{hasActive ? 'Przedłuż' : 'Kup'}</button>
          </article>
        ))}
      </div>

      <h3>Historia karnetów</h3>
      {membership?.history.length ? (
        <table>
          <thead>
            <tr>
              <th>Typ</th>
              <th>Od</th>
              <th>Do</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {membership.history.map((m) => (
              <tr key={m.id}>
                <td>{MEMBERSHIP_LABELS[m.type]}</td>
                <td>{m.startDate}</td>
                <td>{m.endDate}</td>
                <td>{MEMBERSHIP_STATUS_LABELS[m.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">Nie masz jeszcze żadnych karnetów.</p>
      )}

      <h3>Płatności</h3>
      {payments.length ? (
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Karnet</th>
              <th>Kwota</th>
              <th>Karta</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{formatDateTime(p.createdAt)}</td>
                <td>{MEMBERSHIP_LABELS[p.membershipType]}</td>
                <td>{formatPrice(p.amount)}</td>
                <td>•••• {p.cardLast4}</td>
                <td>
                  <span className={`badge ${p.status === 'SUCCEEDED' ? 'ok' : 'full'}`}>{PAYMENT_STATUS_LABELS[p.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted">Brak płatności.</p>
      )}

      {buying && (
        <Modal title="Płatność za karnet" onClose={() => setBuying(null)}>
          <PaymentForm
            plan={buying}
            extending={hasActive}
            onPaid={({ membership: bought }) => {
              setBuying(null);
              setSuccess(
                `Płatność przyjęta. Karnet ${MEMBERSHIP_LABELS[bought.type].toLowerCase()} jest ważny od ${bought.startDate} do ${bought.endDate}.`
              );
              load();
            }}
          />
        </Modal>
      )}
    </section>
  );
}
