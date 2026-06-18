# Kudos System Specification

> **Version:** 1.0  
> **Author:** Graduate Developer, Datacom  
> **Status:** Approved  

---

## 1. Overview

The Kudos System is an internal feature for the Datacom employee portal that allows employees to publicly recognise and appreciate their colleagues. Users can send short appreciation messages (kudos) to peers, which appear on a shared dashboard feed visible to the whole organisation.

---

## 2. Functional Requirements

### 2.1 User Stories

| ID | Role | Story | Priority |
|----|------|-------|----------|
| US-01 | Employee | I can log in securely so that only authenticated employees can send or view kudos | High |
| US-02 | Employee | I can select a colleague from a searchable dropdown list so that I can direct my kudos to the right person | High |
| US-03 | Employee | I can write a short message of appreciation (max 500 characters) so that I can express my gratitude | High |
| US-04 | Employee | I can submit my kudos and receive confirmation so that I know it was received | High |
| US-05 | Employee | I can view a public feed of all recent kudos on the main dashboard so that I can celebrate team wins | High |
| US-06 | Employee | I cannot send kudos to myself so that the system is used for genuine peer recognition | Medium |
| US-07 | Employee | I receive a validation error if I submit an empty or too-long message so that data quality is maintained | Medium |
| US-08 | Administrator | I can hide or delete inappropriate kudos messages so that the feed remains respectful and professional | High |
| US-09 | Administrator | I can view all kudos including hidden ones so that I have full oversight of the system | High |
| US-10 | Administrator | I can record the reason for moderation so that decisions are transparent and auditable | Medium |
| US-11 | Employee | I cannot submit duplicate kudos within a short time window so that spam is prevented | Medium |

### 2.2 Acceptance Criteria

#### US-01 — Authentication
- Users must be authenticated via JWT token before accessing any feature
- Unauthenticated requests to protected routes return `401 Unauthorized`
- Tokens expire after 8 hours

#### US-02 — User Selection
- The recipient dropdown lists all active employees except the current user
- The list is searchable/filterable by name
- The list loads within 1 second on a standard connection

#### US-03 & US-04 — Kudos Submission
- Message field accepts 1–500 characters
- Empty messages are rejected with a clear validation error
- Messages exceeding 500 characters are rejected
- On success, the new kudos appears at the top of the feed immediately

#### US-05 — Public Feed
- Feed displays the 20 most recent **visible** kudos by default
- Each kudos card shows: sender name, recipient name, message, and timestamp
- Feed supports pagination (load more / infinite scroll)
- Feed auto-refreshes every 30 seconds

#### US-06 — Self-Kudos Prevention
- The current user is excluded from the recipient dropdown
- Backend also validates and rejects self-kudos with `400 Bad Request`

#### US-08 & US-09 — Content Moderation
- Admin users see a "Moderate" button on each kudos card in the feed
- Admins can toggle visibility (hide/show) or permanently delete a kudos
- Hidden kudos are invisible to regular employees but visible to admins with a visual indicator
- All moderation actions are logged with `moderated_by`, `moderated_at`, and `moderation_reason`

#### US-11 — Spam Prevention
- A user cannot send kudos to the same recipient more than once per 10-minute window
- Duplicate attempts return `429 Too Many Requests` with a descriptive message

---

## 3. Technical Design

### 3.1 Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js, TypeScript |
| Database | PostgreSQL 15 |
| Auth | JWT (JSON Web Tokens) |
| ORM | Prisma |
| Testing | Jest, React Testing Library |

---

### 3.2 Database Schema

#### Table: `users`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique user identifier |
| `name` | VARCHAR(100) | NOT NULL | Full display name |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Corporate email address |
| `password_hash` | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| `role` | ENUM('employee','admin') | NOT NULL, DEFAULT 'employee' | User role |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | Soft-delete / deactivation flag |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Record creation time |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

#### Table: `kudos`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique kudos identifier |
| `sender_id` | UUID | NOT NULL, FK → users.id | Who sent the kudos |
| `recipient_id` | UUID | NOT NULL, FK → users.id | Who received the kudos |
| `message` | VARCHAR(500) | NOT NULL | Appreciation message |
| `is_visible` | BOOLEAN | NOT NULL, DEFAULT true | Whether kudos is visible in public feed |
| `moderated_by` | UUID | NULLABLE, FK → users.id | Admin who moderated (NULL if not moderated) |
| `moderated_at` | TIMESTAMP | NULLABLE | When moderation action was taken |
| `moderation_reason` | VARCHAR(255) | NULLABLE | Reason provided by admin for hiding/deleting |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | When kudos was submitted |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Last update time |

**Constraints:**
- `CHECK (sender_id != recipient_id)` — prevents self-kudos at DB level
- Index on `(created_at DESC)` — optimises feed queries
- Index on `(sender_id, recipient_id, created_at)` — optimises spam detection queries

---

### 3.3 API Endpoints

#### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | None | Login and receive JWT |
| POST | `/api/auth/logout` | Required | Invalidate session |

**POST `/api/auth/login`**
```json
// Request
{ "email": "user@datacom.com", "password": "secret" }

// Response 200
{ "token": "eyJ...", "user": { "id": "uuid", "name": "Jane Doe", "role": "employee" } }

// Response 401
{ "error": "Invalid email or password" }
```

#### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | Required | List all active users (excluding self) |

**GET `/api/users`**
```json
// Response 200
{
  "users": [
    { "id": "uuid", "name": "John Smith", "email": "j.smith@datacom.com" }
  ]
}
```

#### Kudos

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | `/api/kudos` | Required | Any | Get paginated feed of visible kudos |
| POST | `/api/kudos` | Required | Any | Submit new kudos |
| PATCH | `/api/kudos/:id/visibility` | Required | Admin | Hide or show a kudos |
| DELETE | `/api/kudos/:id` | Required | Admin | Permanently delete a kudos |

**GET `/api/kudos?page=1&limit=20`**
```json
// Response 200
{
  "data": [
    {
      "id": "uuid",
      "sender": { "id": "uuid", "name": "Jane Doe" },
      "recipient": { "id": "uuid", "name": "John Smith" },
      "message": "Amazing work on the Q3 release!",
      "created_at": "2025-06-18T10:00:00Z",
      "is_visible": true
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 142, "totalPages": 8 }
}
```

**POST `/api/kudos`**
```json
// Request
{ "recipient_id": "uuid", "message": "Thank you for your help!" }

// Response 201
{ "id": "uuid", "message": "Kudos sent successfully!", "kudos": { ... } }

// Response 400 (validation)
{ "error": "Message must be between 1 and 500 characters" }

// Response 400 (self-kudos)
{ "error": "You cannot send kudos to yourself" }

// Response 429 (spam)
{ "error": "You already sent kudos to this person recently. Please wait before sending again." }
```

**PATCH `/api/kudos/:id/visibility`** *(Admin only)*
```json
// Request
{ "is_visible": false, "moderation_reason": "Inappropriate language" }

// Response 200
{ "message": "Kudos visibility updated", "kudos": { ... } }
```

---

### 3.4 Frontend Components

```
App
├── AuthProvider (context)
├── Layout
│   ├── Navbar (user info, logout)
│   └── Outlet
├── Pages
│   ├── LoginPage
│   │   └── LoginForm
│   └── DashboardPage
│       ├── KudosForm
│       │   ├── UserSearchDropdown
│       │   ├── MessageTextarea (char counter)
│       │   └── SubmitButton
│       └── KudosFeed
│           ├── KudosCard (sender, recipient, message, time)
│           │   └── ModerationControls (admin only)
│           └── LoadMoreButton / InfiniteScroll
```

---

### 3.5 Security Considerations

- **Authentication:** All API routes (except `/auth/login`) require a valid JWT
- **Authorization:** Moderation endpoints verify `role === 'admin'` server-side
- **Input Sanitisation:** All user input is sanitised before DB insertion to prevent XSS and SQL injection (Prisma parameterised queries)
- **Rate Limiting:** API-level rate limiting (100 req/min per IP) using `express-rate-limit`
- **Password Storage:** Passwords hashed with `bcrypt` (salt rounds: 12)
- **CORS:** Configured to allow only the internal portal origin
- **Helmet.js:** HTTP security headers applied to all responses

---

### 3.6 Performance Considerations

- Feed queries use indexed `created_at DESC` sort with cursor-based pagination
- User list cached in memory for 5 minutes (rarely changes)
- Frontend uses optimistic UI updates for kudos submission (instant feedback)
- Images/avatars served via CDN (future enhancement)

---

### 3.7 Error Handling & Logging

- All errors return a consistent `{ "error": "..." }` JSON shape
- Unexpected server errors return `500` with a generic message (no stack traces in production)
- Server-side logging uses `winston` with log levels: `error`, `warn`, `info`
- All moderation actions are logged to an audit trail

---

## 4. Implementation Plan

### Phase 1 — Backend Foundation
- [ ] **T-01:** Initialise Node.js/Express project with TypeScript
- [ ] **T-02:** Configure PostgreSQL connection and Prisma ORM
- [ ] **T-03:** Write and run database migrations (users, kudos tables)
- [ ] **T-04:** Seed database with sample users
- [ ] **T-05:** Implement JWT authentication middleware
- [ ] **T-06:** Build `POST /api/auth/login` endpoint
- [ ] **T-07:** Build `GET /api/users` endpoint

### Phase 2 — Kudos Core
- [ ] **T-08:** Build `POST /api/kudos` with validation (length, self-send, spam check)
- [ ] **T-09:** Build `GET /api/kudos` with pagination and `is_visible` filter
- [ ] **T-10:** Write unit tests for kudos creation and feed retrieval

### Phase 3 — Moderation
- [ ] **T-11:** Build `PATCH /api/kudos/:id/visibility` (admin only)
- [ ] **T-12:** Build `DELETE /api/kudos/:id` (admin only)
- [ ] **T-13:** Write unit tests for moderation endpoints

### Phase 4 — Frontend
- [ ] **T-14:** Initialise React/TypeScript project with Tailwind CSS
- [ ] **T-15:** Build `LoginPage` with form validation
- [ ] **T-16:** Build `UserSearchDropdown` component
- [ ] **T-17:** Build `KudosForm` with character counter and submission logic
- [ ] **T-18:** Build `KudosFeed` with pagination and auto-refresh
- [ ] **T-19:** Build `KudosCard` with admin `ModerationControls`

### Phase 5 — Integration & Deployment
- [ ] **T-20:** Connect frontend to backend API (Axios/Fetch with JWT header)
- [ ] **T-21:** End-to-end testing of full user flow
- [ ] **T-22:** Write `README.md` with setup instructions
- [ ] **T-23:** Configure environment variables and deployment scripts
- [ ] **T-24:** Final review and production build

---

### 4.1 Task Dependencies

```
T-01 → T-02 → T-03 → T-04
                T-03 → T-05 → T-06 → T-07
                             T-05 → T-08 → T-09 → T-10
                             T-05 → T-11 → T-12 → T-13
T-14 → T-15 → T-16 → T-17 → T-18 → T-19
All backend tasks complete → T-20 → T-21 → T-22 → T-23 → T-24
```

---

### 4.2 Testing Strategy

| Layer | Tool | Coverage Target |
|-------|------|-----------------|
| Unit (backend) | Jest | 80% |
| Integration (API) | Supertest + Jest | All endpoints |
| Component (frontend) | React Testing Library | Key components |
| E2E | Manual / Playwright | Core user flows |

**Core flows to test:**
1. Happy path: login → select user → write message → submit → see in feed
2. Validation: empty message, too-long message, self-kudos
3. Spam prevention: duplicate send within 10 minutes
4. Moderation: admin hides kudos → disappears from public feed

---

### 4.3 Deployment Considerations

- Backend deployed as a Node.js service (Docker container recommended)
- PostgreSQL hosted on a managed service (e.g., AWS RDS, Supabase)
- Frontend built as a static bundle served via CDN or Nginx
- Environment variables managed via `.env` (never committed to Git)
- `.gitignore` includes `node_modules/`, `.env`, `dist/`, `build/`

---

## 5. Out of Scope (v1.0)

- Email notifications when kudos is received
- Kudos categories or tags (e.g., "Teamwork", "Innovation")
- Reactions/likes on kudos
- User profile pages
- Mobile native app
