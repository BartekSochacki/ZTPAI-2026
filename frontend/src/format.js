export function formatDateTime(value) {
  return new Date(value).toLocaleString('pl-PL', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatTime(value) {
  return new Date(value).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
}

export function toLocalInput(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function fromLocalInput(value) {
  return new Date(value).toISOString();
}

export function todayString() {
  return toLocalInput(new Date()).slice(0, 10);
}

export const ROLE_LABELS = { MEMBER: 'Członek', TRAINER: 'Trener', ADMIN: 'Administrator' };

export const ENROLLMENT_LABELS = { ENROLLED: 'Zapisany', WAITLISTED: 'Lista rezerwowa', CANCELLED: 'Anulowany' };

export const MEMBERSHIP_LABELS = { MONTHLY: 'Miesięczny', QUARTERLY: 'Kwartalny', ANNUAL: 'Roczny' };

export const MEMBERSHIP_STATUS_LABELS = { ACTIVE: 'Aktywny', EXPIRED: 'Wygasły', CANCELLED: 'Anulowany' };

export const PAYMENT_STATUS_LABELS = { SUCCEEDED: 'Opłacona', DECLINED: 'Odrzucona' };

export function formatPrice(amount) {
  return `${(amount / 100).toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
}
