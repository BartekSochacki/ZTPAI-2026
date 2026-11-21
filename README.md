# Fitness Club: system zapisów na zajęcia

Aplikacja webowa dla klubu fitness: grafik zajęć grupowych, zapisy uczestników z listą rezerwową, karnety z płatnością testową, panel trenera i panel administratora.

Projekt indywidualny z przedmiotu Zaawansowane Technologie Projektowania Aplikacji Internetowych (Politechnika Krakowska, semestr zimowy 2026/2027).

## Spis treści

1. [O projekcie](#o-projekcie)
2. [Szybki start](#szybki-start)
3. [Adresy i konta demonstracyjne](#adresy-i-konta-demonstracyjne)
4. [Co i jak przetestować](#co-i-jak-przetestować)
5. [Płatność testowa](#płatność-testowa)
6. [Poczta testowa (Mailpit)](#poczta-testowa-mailpit)
7. [Technologie](#technologie)
8. [Architektura](#architektura)
9. [Funkcjonalności i reguły biznesowe](#funkcjonalności-i-reguły-biznesowe)
10. [Model danych (ERD)](#model-danych-erd)
11. [Uwierzytelnianie i autoryzacja](#uwierzytelnianie-i-autoryzacja)
12. [Mechanizmy asynchroniczne i scheduler](#mechanizmy-asynchroniczne-i-scheduler)
13. [REST API](#rest-api)
14. [Konfiguracja](#konfiguracja)
15. [Uruchomienie bez Dockera](#uruchomienie-bez-dockera)
16. [Testy i CI](#testy-i-ci)
17. [Struktura projektu](#struktura-projektu)
18. [Rozwiązywanie problemów](#rozwiązywanie-problemów)
19. [Wersja do oceny](#wersja-do-oceny)

## O projekcie

Aplikacja obsługuje trzy role użytkowników:

| Rola | Co może |
|---|---|
| **MEMBER** (członek klubu) | kupuje karnet, przegląda grafik z filtrami, zapisuje się na zajęcia i z nich rezygnuje, trafia na listę rezerwową, gdy brakuje miejsc |
| **TRAINER** (trener) | widzi swoje prowadzone zajęcia i listy uczestników (tylko swoich zajęć) |
| **ADMIN** (administrator) | układa grafik z kontrolą konfliktów, odwołuje zajęcia, zarządza salami, typami zajęć, karnetami i użytkownikami |

Nowy użytkownik zakłada konto przez rejestrację i zawsze dostaje rolę MEMBER. Role TRAINER i ADMIN nadaje administrator.

## Szybki start

Wymagany jest tylko [Docker Desktop](https://www.docker.com/products/docker-desktop/) (włączony).

1. Skopiuj plik z przykładową konfiguracją:

   ```bash
   cp .env.example .env
   ```

   W PowerShellu: `Copy-Item .env.example .env`.

2. Otwórz plik `.env` i wpisz własne wartości `DB_PASSWORD` oraz `JWT_SECRET` (dowolny długi, losowy tekst). Plik `.env` nie trafia do repozytorium.

3. Uruchom wszystkie kontenery:

   ```bash
   docker compose up --build
   ```

4. Otwórz http://localhost:8080 i zaloguj się jednym z [kont demonstracyjnych](#konta-demonstracyjne).

Przy pierwszym starcie kontener `api` sam tworzy tabele (migracje) i wgrywa dane demonstracyjne. Seed uruchamia się tylko na pustej bazie, więc restart nie nadpisuje danych.

| Komenda | Co robi |
|---|---|
| `docker compose up --build` | buduje obrazy i uruchamia aplikację (logi w terminalu) |
| `docker compose up -d` | uruchamia w tle |
| `docker compose ps` | pokazuje stan kontenerów |
| `docker compose logs api` | logi backendu |
| `docker compose down` | zatrzymuje aplikację (dane zostają) |
| `docker compose down -v` | zatrzymuje i usuwa dane, przy następnym starcie baza jest wypełniona od nowa |

## Adresy i konta demonstracyjne

| Usługa | Adres |
|---|---|
| Aplikacja (frontend) | http://localhost:8080 |
| REST API | http://localhost:3000/api |
| Swagger UI (dokumentacja API) | http://localhost:3000/api/docs |
| Specyfikacja OpenAPI (JSON) | http://localhost:3000/api/docs/openapi.json |
| Healthcheck API | http://localhost:3000/health |
| Skrzynka e-mail (Mailpit) | http://localhost:8025 |

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

To dane testowe z seeda (`backend/src/db/seeds/01_demo_data.js`), a nie prawdziwe sekrety. Seed tworzy też 3 sale, 4 typy zajęć, grafik na najbliższe dni i przykładowe zapisy.

## Co i jak przetestować

| Scenariusz | Kroki | Oczekiwany wynik |
|---|---|---|
| Zapis na zajęcia | zaloguj się jako `jan@fitness.local`, w **Grafiku** kliknij **Zapisz się** | „Zapisano na zajęcia …”, zajęcia widać w **Moje zajęcia** |
| Brak karnetu | zaloguj się jako `bez.karnetu@fitness.local` i spróbuj się zapisać | „Potrzebujesz aktywnego karnetu ważnego w dniu zajęć.” (422) |
| Lista rezerwowa | dwie osoby zapisują się na zajęcia z limitem 1 (np. dodanymi przez admina) | druga osoba trafia na listę rezerwową z pozycją |
| Przeniesienie z rezerwy | osoba zapisana rezygnuje w **Moje zajęcia** | osoba z rezerwy zostaje zapisana i dostaje e-mail w Mailpit |
| Termin rezygnacji | rezygnacja na mniej niż 2 h przed zajęciami | „Rezygnacja jest możliwa najpóźniej 2 godziny przed zajęciami.” |
| Zakup karnetu | zarejestruj nowe konto, **Mój karnet** → **Kup**, karta `4242 4242 4242 4242` | karnet aktywny, płatność w historii, zapis na zajęcia działa |
| Odrzucona płatność | to samo z kartą `4000 0000 0000 0002` | „Płatność odrzucona przez bank.” (402), karnet nie powstaje |
| Konflikt sali | jako `admin@fitness.local` dodaj zajęcia w zajętej sali i godzinie | „Sala jest zajęta w tym czasie.” (409) |
| Konflikt trenera | dodaj zajęcia trenerowi, który w tym czasie prowadzi inne | „Trener prowadzi w tym czasie inne zajęcia.” (409) |
| Optimistic locking | otwórz edycję tych samych zajęć w dwóch kartach i zapisz obie | druga dostaje „Ktoś w międzyczasie zmienił te zajęcia…” (409) |
| Odwołanie zajęć | admin klika **Odwołaj** przy zajęciach z uczestnikami | zapisy anulowane, każdy uczestnik dostaje e-mail |
| Panel trenera | zaloguj się jako `trener1@fitness.local`, **Moje prowadzone zajęcia** | lista zajęć i uczestników |
| Uprawnienia | członek klubu wchodzi na `/admin/rooms` | przekierowanie na grafik, API zwraca 403 |

## Płatność testowa

Zakup karnetu (zakładka **Mój karnet**) używa atrapy bramki płatności (`backend/src/services/paymentGateway.js`). Żadne pieniądze nie są pobierane i nic nie wychodzi poza aplikację. Najprościej przetestować to na nowym koncie założonym przez rejestrację.

| Numer karty | Wynik |
|---|---|
| 4242 4242 4242 4242 | płatność przyjęta |
| 4000 0000 0000 0002 | odrzucona (`CARD_DECLINED`) |
| 4000 0000 0000 9995 | brak środków (`INSUFFICIENT_FUNDS`) |

- Data ważności: dowolna przyszła w formacie MM/RR (przeszła daje `CARD_EXPIRED`).
- CVC: dowolne 3 cyfry.
- Numer karty jest sprawdzany sumą kontrolną Luhna, więc losowe cyfry dają błąd walidacji (400).

Cennik:

| Karnet | Czas | Cena |
|---|---|---|
| Miesięczny (MONTHLY) | 30 dni | 129,00 zł |
| Kwartalny (QUARTERLY) | 90 dni | 349,00 zł |
| Roczny (ANNUAL) | 365 dni | 1199,00 zł |

Gdy członek ma aktywny karnet, nowy zaczyna się dzień po jego końcu (przedłużenie). W bazie zapisywane są tylko 4 ostatnie cyfry karty, a każda próba płatności (udana i odrzucona) trafia do tabeli `payments`.

## Poczta testowa (Mailpit)

Wszystkie e-maile wysyłane przez aplikację trafiają do Mailpit, testowej skrzynki uruchamianej w Dockerze. Maile nie wychodzą do prawdziwych adresów.

**Jak wejść:** otwórz http://localhost:8025 (Docker musi być uruchomiony).

| Kiedy przychodzi mail | Do kogo | Temat |
|---|---|---|
| ktoś zrezygnował i zwolniło się miejsce | osoba przeniesiona z listy rezerwowej | „Masz miejsce na zajęciach: …” |
| admin odwołał zajęcia | każdy zapisany uczestnik | „Zajęcia odwołane: …” |
| zajęcia za mniej niż 24 h (sprawdzane co 10 minut) | każdy zapisany uczestnik, raz na zapis | „Przypomnienie: …” |

Mailpit nie ma własnego wolumenu, więc po przebudowie lub restarcie kontenera skrzynka jest pusta.

## Technologie

| Warstwa | Technologia | Dlaczego |
|---|---|---|
| Backend | Node.js 24, Express 5 | stos z zajęć (zadania 01–04); Express 5 sam przekazuje błędy z funkcji async do obsługi błędów |
| Baza danych | PostgreSQL 16 | pełnoprawna baza jako osobna usługa (regulamin wyklucza SQLite i bazy in-memory) |
| Dostęp do danych | Knex (query builder + migracje) | pełna kontrola nad SQL (`FOR UPDATE`, indeks częściowy) i wbudowane migracje |
| Walidacja | Zod | jeden schemat sprawdza dane i od razu konwertuje typy (np. tekst z query na liczbę) |
| Bezpieczeństwo | JWT (jsonwebtoken), bcryptjs | bezstanowe logowanie tokenem, hasła hashowane z solą |
| Frontend | React 19, React Router 7, Vite | komponenty, routing z ochroną widoków, szybki dev server z proxy `/api` |
| Asynchroniczność | EventEmitter z Node.js | zdarzenia domenowe obsługiwane w tle (lista rezerwowa, e-maile) |
| E-mail | Nodemailer + Mailpit | wysyłka SMTP i testowa skrzynka do podglądu |
| Scheduler | node-cron | wygaszanie karnetów i przypomnienia o zajęciach |
| Płatności | własna atrapa bramki | realistyczny przepływ zakupu bez prawdziwego operatora płatności |
| Dokumentacja API | OpenAPI 3 + Swagger UI | opis wszystkich endpointów z możliwością testowania w przeglądarce |
| Testy | Jest + Supertest | testy jednostkowe serwisów i testy REST API na prawdziwej bazie |
| Uruchomienie | Docker Compose, nginx | cały projekt jedną komendą, frontend serwowany przez nginx |
| CI | GitHub Actions | testy, build frontendu i obrazów Dockera przy każdym pushu |

## Architektura

### Kontenery

```
 przeglądarka
      │
      ▼
┌──────────────┐  /api/*   ┌──────────────┐   SQL    ┌──────────────┐
│ web (nginx)  │ ────────► │ api (Express)│ ───────► │ db (Postgres)│
│ :8080        │           │ :3000        │          │ :5432        │
└──────────────┘           └──────┬───────┘          └──────────────┘
                                  │ SMTP
                                  ▼
                           ┌──────────────┐
                           │ mailpit      │
                           │ :8025 / 1025 │
                           └──────────────┘
```

- **web**: zbudowany React (pliki statyczne) serwowany przez nginx. Zapytania na `/api/` nginx przekazuje do kontenera `api`, a każdy inny adres zwraca `index.html` (routing po stronie przeglądarki).
- **api**: backend. Przy starcie uruchamia migracje, seed (tylko na pustej bazie) i serwer.
- **db**: PostgreSQL z wolumenem `pgdata` (dane przetrwają restart). Skrypt `docker/db-init` tworzy dodatkowo bazę `fitness_test` do testów.
- **mailpit**: testowa skrzynka SMTP z interfejsem WWW.

### Warstwy backendu i przepływ requestu

Przykład: zapis na zajęcia (`POST /api/enrollments`).

1. **routes/index.js**: trasa łączy adres i metodę z middleware i controllerem.
2. **middleware/auth.js**: `authenticate` weryfikuje token JWT, `authorize('MEMBER')` sprawdza rolę.
3. **middleware/validate.js + schemas/**: Zod sprawdza body. Wynik trafia do `req.valid`.
4. **controllers/enrollmentController.js**: pobiera dane z requestu, woła serwis, ustawia kod odpowiedzi (201).
5. **services/enrollmentService.js**: logika biznesowa w transakcji (karnet, limit miejsc, lista rezerwowa).
6. **repositories/enrollmentRepository.js**: zapytania SQL przez Knex.
7. **utils/dto.js**: rekord z bazy zamieniany na obiekt API (camelCase, bez pól wewnętrznych).
8. Błędy z każdej warstwy trafiają do **middleware/errorHandler.js**, który zwraca jednolity JSON.

Logika biznesowa (serwisy) nie zależy od HTTP, dlatego testy jednostkowe sprawdzają ją bez serwera i bez bazy.

## Funkcjonalności i reguły biznesowe

1. **Grafik zajęć** z filtrowaniem (zakres dat, typ zajęć, trener, sala) i paginacją.
2. **Zapisy na zajęcia** z regułami biznesowymi i listą rezerwową.
3. **Automatyczne przeniesienie z listy rezerwowej** po rezygnacji (asynchronicznie, przez zdarzenie) z powiadomieniem e-mail.
4. **Zarządzanie grafikiem (ADMIN)** z kontrolą konfliktów sali i trenera oraz optimistic locking.
5. **Odwołanie zajęć** z anulowaniem zapisów i e-mailami do uczestników.
6. **Karnety (ADMIN)**: przyznawanie (data końca liczona z typu), anulowanie, brak nakładających się karnetów.
7. **Zakup karnetu (MEMBER)** z płatnością testową i historią płatności.
8. **Scheduler**: wygaszanie karnetów i przypomnienia o zajęciach.
9. **Uwierzytelnianie i autoryzacja**: JWT, trzy role, dostęp do zasobów zależny od roli i właściciela.
10. **Zarządzanie użytkownikami (ADMIN)**: lista z wyszukiwaniem, zmiana roli, usuwanie.

### Reguły biznesowe

| Reguła | Kod błędu | HTTP |
|---|---|---|
| Zapis tylko z aktywnym karnetem ważnym w dniu zajęć | `NO_ACTIVE_MEMBERSHIP` | 422 |
| Brak wolnych miejsc oznacza listę rezerwową zamiast odmowy | (status `WAITLISTED`) | 201 |
| Nie można zapisać się dwa razy na te same zajęcia | `ALREADY_ENROLLED` | 409 |
| Nie można zapisać się na zajęcia odwołane lub już rozpoczęte | `SESSION_CANCELLED`, `SESSION_STARTED` | 422 |
| Rezygnacja najpóźniej 2 godziny przed zajęciami (admin bez ograniczeń) | `CANCELLATION_DEADLINE_PASSED` | 422 |
| Członek może anulować tylko własny zapis | `FORBIDDEN` | 403 |
| Sala nie może być zajęta dwa razy w tym samym czasie | `ROOM_CONFLICT` | 409 |
| Trener nie może prowadzić dwóch zajęć naraz | `TRAINER_CONFLICT` | 409 |
| Limit miejsc nie może przekroczyć pojemności sali | `CAPACITY_EXCEEDS_ROOM` | 422 |
| Limit miejsc nie może spaść poniżej liczby zapisanych | `CAPACITY_BELOW_ENROLLED` | 422 |
| Zajęcia muszą odbywać się w przyszłości, prowadzić je może tylko TRAINER | `SESSION_IN_PAST`, `NOT_A_TRAINER` | 422 |
| Edycja z nieaktualną wersją jest odrzucana (optimistic locking) | `VERSION_CONFLICT` | 409 |
| Karnety jednego członka nie mogą się nakładać | `MEMBERSHIP_OVERLAP` | 409 |
| Karnet można przypisać lub kupić tylko dla roli MEMBER | `NOT_A_MEMBER` | 422 |
| Odrzucona płatność nie tworzy karnetu | `CARD_DECLINED`, `INSUFFICIENT_FUNDS`, `CARD_EXPIRED` | 402 |
| Admin nie może zmienić własnej roli ani usunąć własnego konta | `SELF_ROLE_CHANGE`, `SELF_DELETE` | 422 |

### Współbieżność

- Zapis na zajęcia i przenoszenie z listy rezerwowej działają w transakcji z blokadą wiersza zajęć (`SELECT … FOR UPDATE`). Gdy dwie osoby zapisują się na ostatnie miejsce w tej samej chwili, druga czeka i trafia na listę rezerwową.
- Indeks częściowy `UNIQUE (session_id, user_id) WHERE status <> 'CANCELLED'` w bazie blokuje podwójny aktywny zapis tej samej osoby.
- Zakup karnetu blokuje wiersz użytkownika, więc dwa równoległe zakupy nie utworzą nakładających się karnetów.
- Edycja zajęć używa optimistic locking: `UPDATE … WHERE id = ? AND version = ?`.

## Model danych (ERD)

![ERD](docs/erd.svg)

Siedem tabel: `users`, `memberships`, `rooms`, `class_types`, `class_sessions`, `enrollments`, `payments`. Pełny opis kolumn, relacji i ograniczeń jest w [docs/ERD.md](docs/ERD.md).

| Relacja | Typ |
|---|---|
| users → memberships | 1:N |
| users → class_sessions (trener) | 1:N |
| rooms → class_sessions | 1:N |
| class_types → class_sessions | 1:N |
| users ↔ class_sessions przez enrollments | N:M (z danymi: status, kolejność) |
| users → payments | 1:N |
| memberships → payments | 1:0..1 |

Schemat bazy tworzą migracje Knex w `backend/src/db/migrations/`.

## Uwierzytelnianie i autoryzacja

- **Rejestracja** (`POST /api/auth/register`) tworzy konto z rolą MEMBER. Hasło jest hashowane bcryptem (z solą), w bazie nie ma haseł jawnym tekstem.
- **Logowanie** (`POST /api/auth/login`) zwraca token JWT (ważny 2 h) z id, rolą i e-mailem użytkownika. Zły e-mail i złe hasło dają ten sam komunikat.
- Każde chronione zapytanie wymaga nagłówka `Authorization: Bearer <token>`. Middleware `authenticate` weryfikuje podpis tokenu sekretem `JWT_SECRET`.
- `authorize(...role)` ogranicza endpointy do wybranych ról (403 dla pozostałych). Serwisy dodatkowo sprawdzają właściciela zasobu (np. trener widzi uczestników tylko swoich zajęć).
- Frontend trzyma token w `localStorage`, dokleja go do każdego zapytania (`frontend/src/api.js`) i wylogowuje użytkownika po odpowiedzi 401. Komponent `ProtectedRoute` chroni widoki przed niezalogowanymi i przed niewłaściwą rolą.

## Mechanizmy asynchroniczne i scheduler

Zdarzenia domenowe obsługuje `EventEmitter` z Node.js (`backend/src/events/`). Zdarzenie jest emitowane po zatwierdzeniu transakcji, a listener wykonuje zadanie w tle, więc użytkownik nie czeka na nie.

| Zdarzenie | Kiedy | Co robi listener |
|---|---|---|
| `enrollment.cancelled` | rezygnacja z zajętego miejsca | przenosi osoby z listy rezerwowej |
| `session.capacityIncreased` | admin zwiększa limit miejsc | przenosi osoby z listy rezerwowej |
| `waitlist.promoted` | ktoś został przeniesiony z rezerwy | wysyła e-mail „Masz miejsce na zajęciach” |
| `session.cancelled` | admin odwołuje zajęcia | wysyła e-mail do każdego uczestnika |

Scheduler (`backend/src/jobs/scheduler.js`, node-cron, strefa Europe/Warsaw):

| Zadanie | Kiedy |
|---|---|
| wygaszanie przeterminowanych karnetów (status EXPIRED) | codziennie o 00:05 i raz przy starcie serwera |
| przypomnienia o zajęciach w ciągu 24 h (raz na zapis) | co 10 minut |

Scheduler można wyłączyć zmienną `SCHEDULER_ENABLED=false`.

## REST API

Pełna, interaktywna dokumentacja: **http://localhost:3000/api/docs** (Swagger UI). Specyfikacja: [backend/src/docs/openapi.yaml](backend/src/docs/openapi.yaml).

### Endpointy

| Metoda | Ścieżka | Dostęp | Opis |
|---|---|---|---|
| POST | /api/auth/register | publiczny | rejestracja (MEMBER) |
| POST | /api/auth/login | publiczny | logowanie, zwraca JWT |
| GET | /api/auth/me | zalogowany | dane zalogowanego użytkownika |
| GET | /api/sessions | zalogowany | grafik (filtry, paginacja) |
| GET | /api/sessions/:id | zalogowany | szczegóły zajęć |
| POST | /api/sessions | ADMIN | dodanie zajęć |
| PUT | /api/sessions/:id | ADMIN | edycja zajęć (z polem `version`) |
| PATCH | /api/sessions/:id/cancel | ADMIN | odwołanie zajęć |
| DELETE | /api/sessions/:id | ADMIN | usunięcie zajęć |
| GET | /api/sessions/mine | TRAINER | moje prowadzone zajęcia |
| GET | /api/sessions/:id/participants | ADMIN, TRAINER (swoje) | lista uczestników |
| POST | /api/enrollments | MEMBER | zapis na zajęcia lub na listę rezerwową |
| GET | /api/enrollments/me | MEMBER | moje zapisy |
| PATCH | /api/enrollments/:id/cancel | MEMBER (swoje), ADMIN | rezygnacja |
| GET | /api/memberships/me | MEMBER | mój aktywny karnet i historia |
| GET | /api/memberships/plans | zalogowany | cennik karnetów |
| POST | /api/memberships/purchase | MEMBER | zakup karnetu z płatnością testową |
| GET | /api/payments/me | MEMBER | historia moich płatności |
| GET | /api/memberships | ADMIN | lista karnetów (paginacja, filtry `userId`, `status`) |
| POST | /api/memberships | ADMIN | przyznanie karnetu |
| PATCH | /api/memberships/:id/cancel | ADMIN | anulowanie karnetu |
| GET | /api/rooms, /api/rooms/:id | zalogowany | sale |
| POST, PUT, DELETE | /api/rooms, /api/rooms/:id | ADMIN | zarządzanie salami |
| GET | /api/class-types, /api/class-types/:id | zalogowany | typy zajęć |
| POST, PUT, DELETE | /api/class-types, /api/class-types/:id | ADMIN | zarządzanie typami zajęć |
| GET | /api/users | ADMIN | użytkownicy (paginacja, filtry `role`, `search`) |
| GET | /api/users/:id | ADMIN | szczegóły użytkownika |
| PATCH | /api/users/:id/role | ADMIN | zmiana roli |
| DELETE | /api/users/:id | ADMIN | usunięcie użytkownika |
| GET | /api/trainers | zalogowany | lista trenerów |

### Paginacja i filtry

Listy z paginacją przyjmują `page` (domyślnie 1) i `limit` (domyślnie 10, maksymalnie 100) i zwracają:

```json
{
  "data": [ ... ],
  "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 }
}
```

Filtry grafiku (`GET /api/sessions`): `dateFrom`, `dateTo` (YYYY-MM-DD), `classTypeId`, `trainerId`, `roomId`, `includePast`, `includeCancelled` (domyślnie `false`).

Przykład:

```bash
curl -H "Authorization: Bearer <token>" "http://localhost:3000/api/sessions?dateFrom=2026-12-01&classTypeId=2&page=1&limit=10"
```

### Format błędów

Wszystkie błędy mają jednolity format:

```json
{ "error": { "code": "NO_ACTIVE_MEMBERSHIP", "message": "...", "details": [] } }
```

Przy błędzie walidacji `details` zawiera listę pól, np. `[{ "field": "endsAt", "message": "endsAt must be later than startsAt" }]`.

| Kod HTTP | Znaczenie |
|---|---|
| 200 / 201 / 204 | sukces / utworzono / usunięto |
| 400 | błąd walidacji lub niepoprawny JSON |
| 401 | brak lub nieważny token, złe dane logowania |
| 402 | płatność odrzucona |
| 403 | brak uprawnień |
| 404 | brak zasobu lub nieznana trasa |
| 409 | konflikt (duplikat, kolizja terminu, konflikt wersji, powiązane dane) |
| 422 | naruszenie reguły biznesowej |
| 500 | nieoczekiwany błąd serwera (szczegóły tylko w logach) |

## Konfiguracja

Konfiguracja pochodzi wyłącznie ze zmiennych środowiskowych (`backend/src/config/index.js`). Brak `DATABASE_URL` lub `JWT_SECRET` zatrzymuje start serwera z czytelnym komunikatem. Żadne sekrety nie są zapisane w repozytorium.

### Docker Compose: plik `.env` w katalogu głównym

| Zmienna | Opis |
|---|---|
| `DB_USER` | użytkownik bazy |
| `DB_PASSWORD` | hasło bazy (ustaw własne) |
| `DB_NAME` | nazwa bazy |
| `JWT_SECRET` | sekret do podpisywania tokenów (ustaw własny, długi i losowy) |

### Tryb developerski: plik `backend/.env`

| Zmienna | Domyślnie | Opis |
|---|---|---|
| `PORT` | 3000 | port API |
| `DATABASE_URL` | (wymagana) | adres bazy, np. `postgres://user:hasło@localhost:5432/fitness` |
| `TEST_DATABASE_URL` | | adres bazy do testów integracyjnych |
| `JWT_SECRET` | (wymagana) | sekret JWT |
| `JWT_EXPIRES_IN` | 2h | ważność tokenu |
| `CORS_ORIGIN` | http://localhost:5173 | adres frontendu dopuszczony przez CORS |
| `SMTP_HOST`, `SMTP_PORT` | localhost, 1025 | serwer SMTP (Mailpit) |
| `MAIL_FROM` | Fitness Club &lt;no-reply@fitness.local&gt; | nadawca e-maili |
| `SCHEDULER_ENABLED` | true | włącza zadania cron |

## Uruchomienie bez Dockera

Wymagane: Node.js 22+ i działający PostgreSQL z bazami `fitness` i `fitness_test`. Do podglądu maili można osobno uruchomić Mailpit (`docker compose up -d mailpit`).

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run seed
npm run dev
```

W `backend/.env` uzupełnij `DATABASE_URL`, `TEST_DATABASE_URL` i `JWT_SECRET`.

Frontend (w drugim terminalu):

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173 (Vite przekierowuje `/api` na `localhost:3000`).

| Komenda (backend) | Opis |
|---|---|
| `npm run dev` | serwer z automatycznym restartem po zmianach |
| `npm start` | serwer produkcyjny |
| `npm run migrate` | migracje do najnowszej wersji |
| `npm run migrate:rollback` | cofnięcie ostatniej partii migracji |
| `npm run seed` | dane demonstracyjne (tylko na pustej bazie) |

## Testy i CI

```bash
cd backend
npm test
npm run test:unit
npm run test:integration
```

| Komenda | Co uruchamia |
|---|---|
| `npm test` | wszystkie testy (52) |
| `npm run test:unit` | 29 testów jednostkowych logiki biznesowej (mocki repozytoriów, bez bazy) |
| `npm run test:integration` | 23 testy integracyjne REST API (Supertest) na bazie z `TEST_DATABASE_URL` |

Testy jednostkowe (`backend/tests/unit/`) sprawdzają m.in. zapis bez karnetu, listę rezerwową, termin rezygnacji, konflikty sali i trenera, optimistic locking, karnety, zakup i odrzuconą płatność. Testy integracyjne (`backend/tests/integration/`) sprawdzają rejestrację, logowanie, 401 i 403, paginację i filtry, zapis, listę rezerwową, przeniesienie po rezygnacji, kolizję w grafiku oraz zakup karnetu na nowym koncie i zapis po zakupie.

Przy uruchomieniu w Dockerze bazę testową można wskazać tak (PowerShell, hasło z pliku `.env`):

```powershell
$env:TEST_DATABASE_URL = "postgres://fitness:<DB_PASSWORD>@localhost:5432/fitness_test"
npm test
```

**CI (GitHub Actions)**, plik `.github/workflows/ci.yml`, uruchamia się przy każdym pushu na `main` i przy pull requestach:

1. **backend**: PostgreSQL jako usługa, `npm ci`, wszystkie testy,
2. **frontend**: `npm ci`, `npm run build`,
3. **docker**: po sukcesie obu poprzednich `docker compose build`.

## Struktura projektu

```
backend/
  src/
    app.js              konfiguracja Express (middleware, Swagger, trasy, błędy)
    server.js           start serwera, listenery zdarzeń, scheduler, łagodne wyłączanie
    config/             konfiguracja ze zmiennych środowiskowych i stałe reguł
    db/                 połączenie Knex, migracje, seed
    routes/             definicje endpointów + middleware
    middleware/         auth (JWT, role), walidacja Zod, obsługa błędów
    controllers/        obsługa HTTP (request -> serwis -> response)
    services/           logika biznesowa, atrapa bramki płatności
    repositories/       dostęp do danych (zapytania SQL przez Knex)
    schemas/            schematy walidacji Zod (wejściowe DTO)
    utils/              DTO wyjściowe, paginacja, daty
    errors/             klasa AppError
    events/             EventEmitter i listenery
    mail/               wysyłka e-maili (Nodemailer)
    jobs/               scheduler (node-cron)
    docs/               specyfikacja OpenAPI
  tests/
    unit/               testy jednostkowe serwisów
    integration/        testy REST API (Supertest + PostgreSQL)
  Dockerfile
frontend/
  src/
    pages/              widoki (grafik, moje zajęcia, mój karnet, panel trenera i admina)
    components/         komponenty współdzielone (layout, formularze, modal, ochrona tras)
    api.js              klient REST API, token, tłumaczenie kodów błędów
    AuthContext.jsx     stan zalogowanego użytkownika
  Dockerfile, nginx.conf
docker/db-init/         tworzenie bazy testowej przy pierwszym starcie PostgreSQL
docs/                   ERD (opis i diagram)
.github/workflows/      CI
docker-compose.yml
```

## Rozwiązywanie problemów

| Problem | Rozwiązanie |
|---|---|
| `docker compose` zgłasza błąd połączenia z Docker Engine | uruchom Docker Desktop i poczekaj, aż się włączy |
| `Set DB_PASSWORD in .env` / `Set JWT_SECRET in .env` | utwórz plik `.env` z `.env.example` i uzupełnij wartości |
| port 8080, 3000, 5432 lub 8025 jest zajęty | zatrzymaj program, który go używa (np. lokalny PostgreSQL), albo zmień port w `docker-compose.yml` |
| po zmianach w kodzie aplikacja się nie zmienia | `docker compose up --build`, żeby przebudować obrazy |
| chcę wrócić do świeżych danych demo | `docker compose down -v`, potem `docker compose up --build` |
| skrzynka Mailpit jest pusta | to normalne po restarcie kontenera; wywołaj akcję wysyłającą maila (rezygnacja, odwołanie zajęć) |
| po zalogowaniu nagle wylogowuje | token wygasł po 2 h, zaloguj się ponownie |
| testy integracyjne nie łączą się z bazą | sprawdź `TEST_DATABASE_URL` i czy kontener `db` działa (`docker compose ps`) |

## Wersja do oceny

Ostateczna wersja projektu jest oznaczona tagiem `v1.0`. Zmiany wprowadzone po tym tagu nie wchodzą do oceny.
