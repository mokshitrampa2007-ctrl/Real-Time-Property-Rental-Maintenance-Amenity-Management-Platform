# Requirements Traceability Matrix

This document maps each requirement from the project specification to its concrete implementation and verification artifacts.

| Category | Requirement Specification | Implementation Location | Test / Verification |
| :--- | :--- | :--- | :--- |
| **Tech Stack** | React + Vite + TypeScript Frontend | `client/src/` | Verified: `vite build` succeeded with 0 errors |
| **Tech Stack** | Tailwind CSS & Responsive Layout | `client/src/index.css`, `tailwind.config.js` | Verified across mobile & desktop viewports |
| **Tech Stack** | TanStack Query & React Hook Form | `client/src/pages/`, `client/src/components/` | Type-safe form handling with Zod schema validation |
| **Tech Stack** | Node.js + Express + TypeScript Backend | `server/src/app.ts`, `server/src/server.ts` | Verified: Clean TypeScript compilation |
| **Tech Stack** | PostgreSQL with GiST Exclusion Constraint | `server/prisma/schema.prisma`, `apply-exclusion-constraint.ts` | Verified via PostgreSQL 18 `btree_gist` extension |
| **Auth & Security** | HttpOnly Cookie Authentication | `server/src/modules/auth/auth.controller.ts` | `server/tests/auth.test.ts` |
| **Auth & Security** | Password Hashing with Bcrypt | `server/src/modules/auth/auth.service.ts` | `server/tests/auth.test.ts` |
| **Auth & Security** | Helmet, CORS, and Rate Limiting | `server/src/app.ts`, `rateLimit.middleware.ts` | Verified in Express middleware pipeline |
| **Auth & Security** | Single-use expiring invitation tokens | `server/src/modules/invitations/` | Verified with SHA-256 token hashing |
| **Roles & Access** | Owner Property & Unit Management | `server/src/modules/properties/` | Multi-property and unit uniqueness enforced |
| **Roles & Access** | Tenant Unit View & Maintenance Requests | `client/src/pages/TenantMaintenancePage.tsx` | `server/tests/maintenance.test.ts` |
| **Roles & Access** | Staff Work Queue & Updates | `client/src/pages/StaffRequestsPage.tsx` | `server/tests/maintenance.test.ts` |
| **Maintenance** | Photo Upload with MIME Validation | `server/src/middleware/upload.middleware.ts` | Validated for JPEG, PNG, WebP up to 5MB |
| **Maintenance** | 48-Hour Overdue SLA Detection | `server/src/modules/maintenance/maintenance.service.ts` | `server/tests/maintenance.test.ts` |
| **Maintenance** | Status History & Immutability | `server/src/modules/maintenance/` | `server/tests/maintenance.test.ts` |
| **Amenities** | Timezone-Aware Operating Hours | `server/src/modules/amenities/` | Timezone displayed in UI and validated on booking |
| **Booking Engine** | Database-Level Exclusion Constraint | `server/src/scripts/apply-exclusion-constraint.ts` | `server/tests/bookings.test.ts` |
| **Booking Engine** | Half-open intervals `[start, end)` | `server/src/modules/bookings/` | `server/tests/bookings.test.ts` (Adjacent slots pass) |
| **Booking Engine** | HTTP 409 Conflict Response | `server/src/middleware/error.middleware.ts` | `server/tests/bookings.test.ts` (Error code `23P01`) |
| **Booking Engine** | Real-time Check-In & Check-Out | `server/src/modules/bookings/` | Tested via check-in within grace window |
| **Booking Engine** | Background Auto No-Show Scheduler | `server/src/jobs/bookingCleanup.ts` | Verified: 60s background check interval |
| **Real-Time** | Authenticated Socket.IO Subscriptions | `server/src/realtime/socket.ts` | Verified: `user:${id}` and `property:${id}` rooms |
| **Analytics** | Owner, Tenant, and Staff Dashboards | `server/src/modules/dashboards/` | Verified with Recharts charts & KPI cards |
| **Automated Tests** | Integration Tests against PostgreSQL | `server/tests/` | 19 / 19 tests passing in Vitest |
