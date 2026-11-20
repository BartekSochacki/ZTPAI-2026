# Fitness Club: system zapisów na zajęcia

Aplikacja webowa dla klubu fitness do zarządzania grafikiem zajęć grupowych i zapisami uczestników.

- **Członkowie (MEMBER)** z aktywnym karnetem przeglądają grafik, zapisują się na zajęcia i z nich rezygnują. Gdy brakuje miejsc, trafiają na listę rezerwową.
- **Trenerzy (TRAINER)** widzą swoje zajęcia i listy uczestników.
- **Administratorzy (ADMIN)** zarządzają grafikiem, salami, typami zajęć, użytkownikami i karnetami.

## Technologie

| Warstwa | Technologia |
|---|---|
| Backend | Node.js 24, Express 5, Knex (query builder + migracje), Zod (walidacja), JWT, bcryptjs |
| Baza danych | PostgreSQL 16 |
| Frontend | React 19, React Router 7, Vite |
| Asynchroniczność | EventEmitter z Node.js (zdarzenia domenowe) |
| E-mail | Nodemailer + Mailpit (testowa skrzynka SMTP w Dockerze) |
| Scheduler | node-cron |
| Dokumentacja API | OpenAPI 3 + Swagger UI |
| Testy | Jest + Supertest |
| Uruchomienie | Docker Compose (db, api, web, mailpit) |
| CI | GitHub Actions |

## Uruchomienie (Docker Compose)

Wymagany jest Docker Desktop.

```bash
cp .env.example .env
docker compose up --build
```

W pliku `.env` ustaw własne `DB_PASSWORD` i `JWT_SECRET`. Plik `.env` nie trafia do repozytorium.

| Usługa | Adres |
|---|---|
| Aplikacja (frontend) | http://localhost:8080 |
| REST API | http://localhost:3000/api |
| Swagger UI | http://localhost:3000/api/docs |
| Skrzynka e-mail (Mailpit) | http://localhost:8025 |

Przy starcie kontener `api` sam uruchamia migracje i wgrywa dane demonstracyjne (tylko gdy baza jest pusta).

Zatrzymanie: `docker compose down`. Usunięcie danych: `docker compose down -v`.

### Konta demonstracyjne

| Rola | E-mail | Hasło |
|---|---|---|
| ADMIN | admin@fitness.local | Admin123! |
| TRAINER | trener1@fitness.local | Trener123! |
| TRAINER | trener2@fitness.local | Trener123! |
| MEMBER (aktywny karnet) | jan@fitness.local | Member123! |
| MEMBER (aktywny karnet) | ola@fitness.local | Member123! |
| MEMBER (aktywny karnet) | piotr@fitness.local | Member123! |
| MEMBER (karnet wygasły) | bez.karnetu@fitness.local | Member123! |

To dane testowe z seeda (`backend/src/db/seeds/01_demo_data.js`), a nie prawdziwe sekrety.

## Uruchomienie bez Dockera (tryb developerski)

Wymagane: Node.js 22+ i działający PostgreSQL z bazami `fitness` i `fitness_test`.

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

W `backend/.env` uzupełnij `DATABASE_URL`, `TEST_DATABASE_URL` i `JWT_SECRET`.

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173 (Vite przekierowuje `/api` na `localhost:3000`).

## Testy

```bash
cd backend
npm test
npm run test:unit
npm run test:integration
```

- `npm test` uruchamia wszystkie testy.
- `npm run test:unit` uruchamia 23 testy jednostkowe logiki biznesowej i nie wymaga bazy.
- `npm run test:integration` uruchamia 16 testów integracyjnych REST API na bazie z `TEST_DATABASE_URL`.

## Główne funkcjonalności

1. **Grafik zajęć** z filtrowaniem (zakres dat, typ zajęć, trener, sala) i paginacją.
2. **Zapisy na zajęcia** z regułami biznesowymi:
   - zapis tylko z aktywnym karnetem ważnym w dniu zajęć,
   - lista rezerwowa, gdy brak wolnych miejsc,
   - rezygnacja najpóźniej 2 godziny przed zajęciami,
   - brak podwójnych zapisów i zapisów na zajęcia, które już się zaczęły lub zostały odwołane.
3. **Automatyczne przesunięcie z listy rezerwowej**: rezygnacja emituje zdarzenie `enrollment.cancelled`. Listener asynchronicznie przenosi pierwszą osobę z listy rezerwowej i wysyła jej e-mail.
4. **Zarządzanie grafikiem (ADMIN)** z walidacją konfliktów:
   - sala ani trener nie mogą być zajęci w tym samym czasie,
   - limit miejsc nie może przekraczać pojemności sali,
   - nie można zmniejszyć limitu poniżej liczby zapisanych osób,
   - optimistic locking (pole `version`) chroni przed nadpisaniem cudzych zmian.
5. **Odwołanie zajęć**: anuluje wszystkie zapisy i wysyła e-maile do uczestników.
6. **Scheduler**:
   - codziennie o 00:05 wygasza przeterminowane karnety,
   - co 10 minut wysyła przypomnienia o zajęciach w ciągu najbliższych 24 h.
7. **Karnety (ADMIN)**: przyznawanie (data końca liczona z typu), anulowanie, brak nakładających się karnetów.
8. **Uwierzytelnianie i autoryzacja**: JWT oraz role MEMBER, TRAINER i ADMIN. Trener widzi uczestników tylko swoich zajęć.

## Struktura projektu

```
backend/
  src/
    config/         konfiguracja ze zmiennych środowiskowych
    db/             połączenie Knex, migracje, seed
    routes/         definicje endpointów + middleware (auth, walidacja)
    controllers/    obsługa HTTP (request -> service -> response)
    services/       logika biznesowa
    repositories/   dostęp do danych (zapytania SQL przez Knex)
    schemas/        schematy walidacji Zod (wejściowe DTO)
    utils/dto.js    mapowanie rekordów bazy na wyjściowe DTO
    events/         EventEmitter i listenery
    mail/           wysyłka e-maili
    jobs/           scheduler (cron)
    docs/           specyfikacja OpenAPI
  tests/unit/       testy jednostkowe serwisów (mocki repozytoriów)
  tests/integration/ testy REST API (Supertest + PostgreSQL)
frontend/
  src/pages/        widoki
  src/components/   komponenty współdzielone
  src/api.js        klient REST API + obsługa błędów
docs/ERD.md         diagram modelu danych
```

## Dokumentacja

- **ERD**: [docs/ERD.md](docs/ERD.md)
- **REST API**: Swagger UI pod `/api/docs`, specyfikacja w [backend/src/docs/openapi.yaml](backend/src/docs/openapi.yaml)

### Przegląd endpointów

| Metoda | Ścieżka | Dostęp | Opis |
|---|---|---|---|
| POST | /api/auth/register | publiczny | rejestracja (MEMBER) |
| POST | /api/auth/login | publiczny | logowanie, zwraca JWT |
| GET | /api/auth/me | zalogowany | dane użytkownika |
| GET | /api/sessions | zalogowany | grafik (filtry, paginacja) |
| GET | /api/sessions/:id | zalogowany | szczegóły zajęć |
| POST | /api/sessions | ADMIN | dodanie zajęć |
| PUT | /api/sessions/:id | ADMIN | edycja (z `version`) |
| PATCH | /api/sessions/:id/cancel | ADMIN | odwołanie zajęć |
| DELETE | /api/sessions/:id | ADMIN | usunięcie zajęć |
| GET | /api/sessions/mine | TRAINER | moje prowadzone zajęcia |
| GET | /api/sessions/:id/participants | ADMIN, TRAINER (swoje) | lista uczestników |
| POST | /api/enrollments | MEMBER | zapis / lista rezerwowa |
| GET | /api/enrollments/me | MEMBER | moje zapisy |
| PATCH | /api/enrollments/:id/cancel | MEMBER (swoje), ADMIN | rezygnacja |
| GET | /api/memberships/me | MEMBER | mój karnet |
| GET, POST | /api/memberships | ADMIN | lista / przyznanie karnetu |
| PATCH | /api/memberships/:id/cancel | ADMIN | anulowanie karnetu |
| GET, POST, PUT, DELETE | /api/rooms | odczyt: zalogowany, zapis: ADMIN | sale |
| GET, POST, PUT, DELETE | /api/class-types | odczyt: zalogowany, zapis: ADMIN | typy zajęć |
| GET | /api/users | ADMIN | użytkownicy (paginacja, wyszukiwanie) |
| PATCH | /api/users/:id/role | ADMIN | zmiana roli |
| DELETE | /api/users/:id | ADMIN | usunięcie użytkownika |
| GET | /api/trainers | zalogowany | lista trenerów |

### Format błędów

Wszystkie błędy mają jednolity format:

```json
{ "error": { "code": "NO_ACTIVE_MEMBERSHIP", "message": "...", "details": [] } }
```

| Kod HTTP | Znaczenie |
|---|---|
| 400 | błąd walidacji (pole `details` zawiera listę pól) |
| 401 | brak lub nieważny token |
| 403 | brak uprawnień |
| 404 | brak zasobu |
| 409 | konflikt (duplikat, kolizja terminu, konflikt wersji) |
| 422 | naruszenie reguły biznesowej |
| 500 | nieoczekiwany błąd serwera |
