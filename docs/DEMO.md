# Scenariusz demo (3–5 minut)

Plan nagrania demo wymaganego przy oddaniu projektu. Przed nagraniem uruchom aplikację (`docker compose up --build`) i otwórz w przeglądarce trzy karty:

- aplikacja: http://localhost:8080
- Swagger UI: http://localhost:3000/api/docs
- Mailpit: http://localhost:8025

Konta demo są w [README](../README.md#konta-demonstracyjne).

## 1. Wprowadzenie (ok. 30 s)

- Jednym zdaniem: aplikacja do zapisów na zajęcia w klubie fitness, trzy role (MEMBER, TRAINER, ADMIN).
- Pokaż strukturę repozytorium: `backend/src` (routes, controllers, services, repositories), `frontend/src`, `docker-compose.yml`.

## 2. Przepływ requestu (ok. 45 s)

Pokaż w IDE po kolei, na przykładzie zapisu na zajęcia (`POST /api/enrollments`):

1. `routes/index.js`: trasa z `authenticate`, `authorize('MEMBER')` i `validate`,
2. `controllers/enrollmentController.js`: odczyt danych z requestu i kod odpowiedzi,
3. `services/enrollmentService.js`: reguły biznesowe w transakcji,
4. `repositories/enrollmentRepository.js`: zapytania Knex do PostgreSQL,
5. `utils/dto.js`: mapowanie rekordu bazy na odpowiedź API.

## 3. Członek klubu (ok. 1 min)

1. Zaloguj się jako `jan@fitness.local`.
2. Grafik: użyj filtrów (typ zajęć, trener, data) i przejdź na kolejną stronę wyników.
3. Zapisz się na zajęcia: status „zapisany”.
4. Zapisz się na zajęcia bez wolnych miejsc (albo ustaw limit 1 jako admin): status „lista rezerwowa”.
5. Wyloguj się i zaloguj jako `bez.karnetu@fitness.local`. Próba zapisu kończy się komunikatem o braku aktywnego karnetu (reguła biznesowa, HTTP 422).

## 4. Lista rezerwowa i e-mail (ok. 45 s)

1. Jako osoba zapisana zrezygnuj z zajęć.
2. Wyjaśnij: rezygnacja emituje zdarzenie `enrollment.cancelled`, listener w tle przenosi pierwszą osobę z listy rezerwowej.
3. Pokaż w Mailpit e-mail „masz miejsce” wysłany do przeniesionej osoby.

## 5. Trener i administrator (ok. 1 min)

1. Zaloguj się jako `trener1@fitness.local`: lista prowadzonych zajęć i uczestników.
2. Zaloguj się jako `admin@fitness.local`.
3. Dodaj zajęcia w sali i godzinie, które są już zajęte: komunikat o konflikcie sali (HTTP 409).
4. Edytuj zajęcia, dodaj salę albo typ zajęć, przyznaj karnet.
5. Odwołaj zajęcia i pokaż w Mailpit e-maile do uczestników.

## 6. Dokumentacja, testy, uruchomienie (ok. 30 s)

- Swagger UI: lista endpointów i przykładowe wywołanie z tokenem.
- `docs/ERD.md`: model danych (6 tabel).
- `npm test` w katalogu `backend`: 39 testów (23 jednostkowe, 16 integracyjnych).
- Zakładka Actions na GitHubie: zielony przebieg CI.

## Pytania, na które trzeba umieć odpowiedzieć

| Pytanie | Gdzie szukać |
|---|---|
| Architektura i struktura projektu | README, sekcja „Struktura projektu” |
| Przepływ requestu od endpointu do bazy | punkt 2 tego scenariusza |
| Model danych | `docs/ERD.md` |
| Authentication i authorization | `middleware/auth.js`, `services/authService.js` |
| Reguła biznesowa | `services/enrollmentService.js` (karnet, limit miejsc, termin rezygnacji) |
