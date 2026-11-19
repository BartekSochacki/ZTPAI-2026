const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const MESSAGES = {
  VALIDATION_ERROR: 'Niepoprawne dane formularza.',
  INVALID_JSON: 'Niepoprawny format danych.',
  UNAUTHORIZED: 'Nieprawidłowy e-mail lub hasło albo sesja wygasła.',
  FORBIDDEN: 'Nie masz uprawnień do tej operacji.',
  NOT_FOUND: 'Nie znaleziono zasobu.',
  DUPLICATE: 'Taki rekord już istnieje.',
  RELATION_CONFLICT: 'Nie można usunąć - rekord jest powiązany z innymi danymi.',
  EMAIL_TAKEN: 'Ten adres e-mail jest już zajęty.',
  NO_ACTIVE_MEMBERSHIP: 'Potrzebujesz aktywnego karnetu ważnego w dniu zajęć.',
  ALREADY_ENROLLED: 'Jesteś już zapisany na te zajęcia lub na liście rezerwowej.',
  SESSION_CANCELLED: 'Zajęcia zostały odwołane.',
  SESSION_STARTED: 'Zajęcia już się rozpoczęły.',
  SESSION_IN_PAST: 'Zajęcia muszą odbywać się w przyszłości.',
  CANCELLATION_DEADLINE_PASSED: 'Rezygnacja jest możliwa najpóźniej 2 godziny przed zajęciami.',
  ALREADY_CANCELLED: 'Zapis jest już anulowany.',
  ROOM_CONFLICT: 'Sala jest zajęta w tym czasie.',
  TRAINER_CONFLICT: 'Trener prowadzi w tym czasie inne zajęcia.',
  CAPACITY_EXCEEDS_ROOM: 'Limit miejsc przekracza pojemność sali.',
  CAPACITY_BELOW_ENROLLED: 'Limit miejsc nie może być mniejszy niż liczba zapisanych osób.',
  VERSION_CONFLICT: 'Ktoś w międzyczasie zmienił te zajęcia. Odśwież dane i spróbuj ponownie.',
  NOT_A_TRAINER: 'Wybrany użytkownik nie jest trenerem.',
  NOT_A_MEMBER: 'Karnet można przypisać tylko członkowi klubu (MEMBER).',
  MEMBERSHIP_OVERLAP: 'Użytkownik ma już aktywny karnet w tym okresie.',
  MEMBERSHIP_IN_PAST: 'Taki karnet byłby już nieważny.',
  MEMBERSHIP_NOT_ACTIVE: 'Można anulować tylko aktywny karnet.',
  SELF_ROLE_CHANGE: 'Nie możesz zmienić własnej roli.',
  SELF_DELETE: 'Nie możesz usunąć własnego konta.',
  INTERNAL_ERROR: 'Błąd serwera. Spróbuj ponownie później.'
};

export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details || [];
  }
}

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = getToken();
  const headers = {};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Brak połączenia z serwerem.');
  }

  if (response.status === 204) {
    return null;
  }
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = data?.error || {};
    if (response.status === 401 && token) {
      setToken(null);
      window.dispatchEvent(new Event('auth:expired'));
    }
    throw new ApiError(response.status, error.code, MESSAGES[error.code] || error.message || 'Wystąpił błąd.', error.details);
  }
  return data;
}

export function toQuery(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      search.set(key, value);
    }
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}
