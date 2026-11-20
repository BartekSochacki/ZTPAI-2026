# Model danych (ERD)

![ERD](erd.svg)

```mermaid
erDiagram
    USERS ||--o{ MEMBERSHIPS : "posiada"
    USERS ||--o{ ENROLLMENTS : "zapisuje się"
    USERS ||--o{ CLASS_SESSIONS : "prowadzi (trener)"
    ROOMS ||--o{ CLASS_SESSIONS : "odbywają się w"
    CLASS_TYPES ||--o{ CLASS_SESSIONS : "jest typem"
    CLASS_SESSIONS ||--o{ ENROLLMENTS : "ma zapisy"

    USERS {
        int id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        enum role "MEMBER | TRAINER | ADMIN"
        timestamptz created_at
    }
    MEMBERSHIPS {
        int id PK
        int user_id FK
        enum type "MONTHLY | QUARTERLY | ANNUAL"
        date start_date
        date end_date
        enum status "ACTIVE | EXPIRED | CANCELLED"
        timestamptz created_at
    }
    ROOMS {
        int id PK
        string name UK
        int capacity
        timestamptz created_at
    }
    CLASS_TYPES {
        int id PK
        string name UK
        text description
        timestamptz created_at
    }
    CLASS_SESSIONS {
        int id PK
        int class_type_id FK
        int trainer_id FK
        int room_id FK
        timestamptz starts_at
        timestamptz ends_at
        int capacity
        enum status "SCHEDULED | CANCELLED"
        int version "optimistic locking"
        timestamptz created_at
        timestamptz updated_at
    }
    ENROLLMENTS {
        int id PK
        int session_id FK
        int user_id FK
        enum status "ENROLLED | WAITLISTED | CANCELLED"
        boolean reminder_sent
        timestamptz created_at
        timestamptz updated_at
    }
```

## Relacje

| Relacja | Typ | Opis |
|---|---|---|
| users → memberships | 1:N | Członek może mieć wiele karnetów (historia), ale tylko jeden aktywny w danym okresie. |
| users → enrollments | 1:N | Członek może mieć wiele zapisów. |
| users → class_sessions | 1:N | Trener (użytkownik z rolą TRAINER) prowadzi wiele zajęć. |
| rooms → class_sessions | 1:N | W sali odbywa się wiele zajęć (nigdy dwa w tym samym czasie). |
| class_types → class_sessions | 1:N | Typ zajęć (np. Yoga) ma wiele terminów w grafiku. |
| class_sessions → enrollments | 1:N | Zajęcia mają wielu uczestników i listę rezerwową. |

`users` ↔ `class_sessions` przez `enrollments` to relacja wiele-do-wielu z dodatkowymi danymi (status, kolejność na liście rezerwowej).

## Ograniczenia w bazie

- `UNIQUE (session_id, user_id) WHERE status <> 'CANCELLED'`: jeden aktywny zapis użytkownika na dane zajęcia.
- `CHECK (ends_at > starts_at)`, `CHECK (capacity > 0)`, `CHECK (end_date >= start_date)`.
- `ON DELETE RESTRICT` dla sal, typów zajęć i trenerów (nie można usunąć sali, w której są zajęcia).
- `ON DELETE CASCADE` dla zapisów i karnetów (usunięcie użytkownika usuwa jego dane).
