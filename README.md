# EstateSync — Real-Time Property Rental, Maintenance & Amenity Management Platform

A centralized, production-grade full-stack web application designed for property owners, tenants, and maintenance staff. EstateSync coordinates property tenancies, manages end-to-end maintenance workflows with attachments and real-time updates, and enforces conflict-free amenity bookings using a **PostgreSQL exclusion constraint** at the database level.

---

## 🚀 Live Local Links

| Component | URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | [**http://localhost:5173**](http://localhost:5173) | Interactive React + Vite SPA with real-time Socket.IO subscriptions |
| **Backend API & Health** | [**http://localhost:4000/api/health**](http://localhost:4000/api/health) | Express REST API server, WebSocket server, and static production host |
| **API Base URL** | `http://localhost:4000/api` | REST endpoints for Auth, Properties, Maintenance, Amenities, Bookings, Dashboards |

---

## 👥 Demo Accounts (Pre-Seeded)

All demo accounts share the password: `Password123!`

The landing page (`http://localhost:5173`) features **One-Click Quick Login** cards for each role:

| Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@example.com` | `Password123!` | Multi-property management, unit tenancy assignments, staff invitations, maintenance assignment, amenity scheduling, booking approvals, operational KPI dashboards |
| **Tenant 1** | `tenant1@example.com` | `Password123!` | Unit 101 resident: submit maintenance tickets with photos, reserve amenities (e.g., Fitness Center, Pool), real-time check-in/out, cancel eligible bookings |
| **Tenant 2** | `tenant2@example.com` | `Password123!` | Unit 204 resident: independent tenancy, submit tickets, concurrent booking conflict validation |
| **Maintenance Staff** | `staff@example.com` | `Password123!` | Work queue: view assigned requests, transition statuses (`PENDING` → `IN_PROGRESS` → `COMPLETED`), post progress updates, real-time notification alerts |

---

## ⚙️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, React Router v6, TanStack Query v5, React Hook Form, Zod, Recharts, Socket.IO Client, Lucide Icons.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, Socket.IO, Multer, Zod, Bcrypt, JsonWebToken.
- **Database**: PostgreSQL 18 with `btree_gist` extension for database-level GiST exclusion constraints.
- **Testing**: Vitest, Supertest with real PostgreSQL integration tests.

---

## 📦 Prerequisites

- **Node.js**: `v18.0.0` or later
- **npm**: `v9.0.0` or later
- **PostgreSQL**: Port `5432` (an automated embedded PostgreSQL cluster is included via `npm run db:start`, or use Docker Compose via `docker compose up -d`)

---

## 🛠️ Quickstart Guide

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd "Real-Time Property Rental, Maintenance & Amenity Management Platform"
npm install
```

### 2. Environment Configuration
The `.env` file at the root contains local defaults:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/property_management?schema=public"
PORT=4000
NODE_ENV=development
CLIENT_ORIGIN="http://localhost:5173"
JWT_SECRET="super-secure-production-ready-jwt-secret-key-32-chars-min"
JWT_EXPIRES_IN="7d"
COOKIE_NAME="prop_mgmt_token"
COOKIE_SECURE=false
STORAGE_DRIVER=local
UPLOAD_DIR="./uploads"
```

### 3. Start Database & Seed Data
```bash
# Start embedded PostgreSQL daemon (port 5432)
npm run db:start

# Seed properties, units, tenants, amenities, tickets, and apply the exclusion constraint
npm run db:seed
```

### 4. Run Development Servers
```bash
# Starts both Backend (port 4000) and Frontend (port 5173) concurrently
npm run dev
```

Visit [**http://localhost:5173**](http://localhost:5173) in your browser.

---

## 🧪 Automated Testing

The automated test suite runs against the real PostgreSQL database, verifying authentication, maintenance status state machines, and concurrency-safe booking exclusion constraints:

```bash
npm test
```

### Verified Test Results
```text
 ✓ server/tests/auth.test.ts (5 tests)
 ✓ server/tests/maintenance.test.ts (7 tests)
 ✓ server/tests/bookings.test.ts (7 tests)

 Test Files  3 passed (3)
      Tests  19 passed (19)
```

Highlights of tested behaviors:
1. **Database-Level Exclusion Constraint**: Rejects overlapping bookings with HTTP 409 `BOOKING_CONFLICT` via Postgres `23P01`.
2. **Adjacent Booking Support**: Half-open intervals `[start, end)` permit back-to-back bookings (e.g., 10:00–11:00 and 11:00–12:00).
3. **Simultaneous Concurrency**: Two requests sent at the exact same millisecond result in strictly one winner and one HTTP 409 rejection.
4. **Slot Release on Cancellation**: Cancelling an active reservation immediately frees the slot for other tenants.
5. **Phase 1 Maintenance Immutability**: Completed tickets cannot be reopened or mutated.
6. **Role Isolation**: Strict server-side tenancy and ownership boundaries.

---

## 🔒 Concurrency-Safe Amenity Booking Design

Overlapping bookings are prevented **at the database level** rather than relying on brittle application-level checks:

```sql
ALTER TABLE "AmenityBooking"
ADD CONSTRAINT "no_overlapping_bookings"
EXCLUDE USING gist (
  "amenityId" WITH =,
  tsrange("startsAt"::timestamp, "endsAt"::timestamp) WITH &&
)
WHERE ("status" = 'PENDING_APPROVAL' OR "status" = 'CONFIRMED' OR "status" = 'CHECKED_IN');
```

- **Exclusive Reservation**: In Phase 1, each booking exclusively reserves the amenity for that interval.
- **Active States Block**: `PENDING_APPROVAL`, `CONFIRMED`, and `CHECKED_IN` hold the slot.
- **Inactive States Release**: `REJECTED`, `CANCELLED`, `COMPLETED`, and `NO_SHOW` release the slot for new reservations.
- **Timezone Awareness**: Operating hours and bookings are computed in the property's IANA timezone (e.g., `America/New_York`).
- **Check-In/Check-Out**: Grace periods are enforced, and an automated background scheduler marks unfulfilled bookings as `NO_SHOW`.

---

## 📁 Repository Structure

```text
├── client/                     # Frontend React + Vite application
│   ├── src/
│   │   ├── api/                # Axios / fetch clients with cookie credentials
│   │   ├── components/         # Reusable UI (Navbar, Sidebar, Badges, Modals)
│   │   ├── context/            # AuthContext, SocketContext
│   │   ├── pages/              # Owner, Tenant, Staff, and Shared pages
│   │   ├── types/              # TypeScript interfaces and Zod schemas
│   │   └── App.tsx             # Role-based protected routes
│   └── vite.config.ts          # Vite configuration with API & Socket proxy
├── server/                     # Backend Express + Prisma + Socket.IO
│   ├── prisma/
│   │   ├── schema.prisma       # 16 normalized models & enums
│   │   └── seed.ts             # Realistic database seed
│   ├── src/
│   │   ├── config/             # Environment, Prisma client, constants
│   │   ├── jobs/               # Booking auto-cleanup & overdue schedulers
│   │   ├── middleware/         # Auth, Role, Error, Multer upload middlewares
│   │   ├── modules/            # Domain modules (auth, properties, maintenance, amenities, bookings, dashboards)
│   │   ├── realtime/           # Socket.IO connection and room management
│   │   └── server.ts           # HTTP server bootstrapping & graceful shutdown
│   └── tests/                  # Integration test suite (Supertest + Vitest)
├── docs/                       # Comprehensive Architecture, PRD, and API Docs
├── docker-compose.yml          # PostgreSQL 18 container setup
└── package.json                # Workspace scripts
```

---

## 📖 Additional Documentation

- [Product Requirements Document (PRD)](file:///docs/PRD.md)
- [System Architecture](file:///docs/ARCHITECTURE.md)
- [Database Schema & ER Diagram](file:///docs/DATABASE.md)
- [REST API Reference](file:///docs/API.md)
- [Testing & Quality Assurance](file:///docs/TESTING.md)
- [Deployment Guide](file:///docs/DEPLOYMENT.md)
- [Demonstration & Review Walkthrough](file:///docs/DEMO_GUIDE.md)
- [Requirements Traceability Matrix](file:///docs/REQUIREMENTS_TRACEABILITY.md)
