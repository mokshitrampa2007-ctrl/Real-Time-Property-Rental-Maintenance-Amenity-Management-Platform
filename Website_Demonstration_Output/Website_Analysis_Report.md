# Website Analysis Report

## Project: Real-Time Property Rental, Maintenance & Amenity Management Platform (EstateSync)
**Date**: October 31, 2026  
**Audience**: Internship Evaluation Committee, Technical Reviewers, and Faculty Assessors  
**Platform URL**: `http://localhost:5173/`

---

## 1. Executive Summary & Project Purpose

EstateSync is a comprehensive multi-tenant property management platform designed to streamline operations across residential properties. Modern property management involves constant friction between landlords, residents, and facilities staff: tenancies are difficult to audit, repair tickets get lost or delayed, and shared community amenities (gyms, pools, clubhouses) suffer from double-booking disputes.

EstateSync resolves these operational bottlenecks through a unified, responsive web platform featuring:
- **Strict Role-Based Authorization** for Owners, Tenants, and Maintenance Technicians.
- **Auditable Maintenance Lifecycles** with photo attachments, threaded comments, and automatic 48-hour SLA overdue detection.
- **Conflict-Free Amenity Scheduling** enforced at the database level via PostgreSQL GiST exclusion constraints.
- **Real-Time Operational Updates** via authenticated WebSockets (Socket.IO) that trigger instant client-side cache invalidation.

---

## 2. Comprehensive Feature Analysis

### 2.1 Public Landing Page & Authentication
- **Modern Landing Experience**: Responsive hero banner, feature value propositions, system architecture highlights, and quick-access navigation.
- **One-Click Demo Access**: Embedded quick-login cards for Victoria Sterling (Owner), Marcus Vance (Tenant 1), Elena Rostova (Tenant 2), and Alex Rivera (Staff) enable friction-free evaluation without entering credentials manually.
- **Secure Authentication Flow**: Standard email and password login, bcrypt password hashing (10 salt rounds), and JSON Web Tokens delivered exclusively inside `HttpOnly` cookies (`prop_mgmt_token`) with SameSite protection against XSS and CSRF attacks.
- **Expiring Single-Use Invitations**: Owners onboard residents and staff via cryptographically secure invitation links. Tokens are stored as SHA-256 hashes with hard expiration timestamps, invalidating automatically upon acceptance.

### 2.2 Property Owner Management Suite
- **Portfolio Analytics Dashboard**:
  - Key Performance Indicator (KPI) cards: Total Properties, Occupied Units, Active Maintenance Tickets, and Overdue Requests (>48 hours).
  - Responsive visual charts built with Recharts: Property Occupancy Breakdown (Occupied vs. Vacant) and Maintenance Ticket Distribution by Priority and Status.
- **Property & Unit Administration**:
  - Multi-property management supporting distinct IANA timezones (e.g., `America/New_York`, `America/Chicago`).
  - Unit roster management with strict database-level unique constraints preventing duplicate unit numbers within a property.
  - Active Tenancy enforcement: Validates lease start and end dates, preventing multiple active overlapping tenancies for an exclusively leased unit.
- **Staff Roster Management**:
  - Manage assigned technicians per property, inspect active workloads, and revoke assignments when necessary.
- **Maintenance Triage & Dispatch**:
  - Comprehensive ticket filtering by status (`PENDING`, `IN_PROGRESS`, `COMPLETED`), priority, trade category, and assigned staff member.
  - Reassign technicians dynamically with real-time WebSocket alerts to affected personnel.
- **Amenity Configuration**:
  - Define shared resources: operating hours per weekday in the property timezone, capacity limits, advance booking limits (e.g. up to 14 days), minimum and maximum booking durations, cancellation cutoffs, and check-in grace periods.
  - Schedule temporary maintenance closures with active validation preventing silent invalidation of confirmed tenant reservations.

### 2.3 Residential Tenant Experience
- **Resident Residence Dashboard**:
  - Real-time display of assigned property, unit number, floor, lease start date, and lease status.
  - Quick-action banner indicating active check-in sessions or upcoming reservations.
- **Maintenance Request Submission**:
  - Form validation with React Hook Form and Zod: Title, Category (Plumbing, Electrical, HVAC, Appliance, Structural, Pest Control, Other), Priority (Low, Medium, High, Urgent), and Description.
  - Photo Evidence Upload: Validates image MIME types (`image/jpeg`, `image/png`, `image/webp`) and enforces a 5MB size limit. Files are stored with randomized UUID storage keys.
- **Interactive Amenity Discovery & Booking**:
  - Visual amenity cards displaying amenities (Fitness Center, Rooftop Lounge, Swimming Pool), capacity limits, location, and operating hours.
  - Interactive date and time picker enforcing half-open intervals `[start, end)`.
  - Immediate feedback on slot availability, rules, and attendee capacity limits.
- **Reservation Check-In & Check-Out**:
  - Self-service arrival confirmation: Activates during the booking interval within the designated grace window.
  - Early check-out: Allows residents to release reserved amenities early, immediately freeing the facility for fellow residents.

### 2.4 Maintenance Technician Workflow
- **Assigned Work Queue**:
  - Prioritized ticket queue showing unit details, resident contact info, issue category, urgency level, and age.
  - Visual badges highlighting overdue tickets (>48 hours unresolved).
- **Status Progression Machine**:
  - Progressive status updates: `PENDING` → `IN_PROGRESS` → `COMPLETED`.
  - Every transition creates an immutable `MaintenanceStatusHistory` audit record.
  - **Phase 1 Read-Only Invariant**: Once marked `COMPLETED`, tickets are sealed against further mutation, preserving audit and dispute integrity.
- **Threaded Communication**:
  - Real-time comment thread between resident, technician, and owner on each ticket.

---

## 3. Technical Architecture & Implementation Details

```
+---------------------------------------------------------------------------------+
|                                CLIENT APPLICATION                               |
|   React 18 + Vite | Tailwind CSS | React Router v6 | TanStack Query | Recharts  |
+---------------------------------------------------------------------------------+
                                      |   ^
                    HTTP REST (JSON)  |   |  Socket.IO (WSS)
                                      v   |
+---------------------------------------------------------------------------------+
|                                 SERVER LAYER                                    |
|   Node.js + Express + TypeScript | Helmet | CORS | RateLimiter | CookieParser   |
+---------------------------------------------------------------------------------+
|   Modules: Auth, Properties, Maintenance, Amenities, Bookings, Dashboards       |
|   Jobs: Booking Auto No-Show Sweep (60s) | Overdue Maintenance Monitor          |
+---------------------------------------------------------------------------------+
                                      |   ^
                         Prisma ORM   |   |  PostgreSQL Native Queries
                                      v   |
+---------------------------------------------------------------------------------+
|                               POSTGRESQL 18                                     |
|   16 Normalized Entities | btree_gist Extension | GiST Exclusion Constraint     |
|   no_overlapping_bookings: tsrange(startsAt, endsAt) && WITH = amenityId        |
+---------------------------------------------------------------------------------+
```

### 3.1 Concurrency-Safe Booking Engine
The primary engineering challenge of shared facility reservation is race conditions under simultaneous booking attempts. EstateSync avoids application-level check-then-insert flaws by offloading concurrency control directly to PostgreSQL:

```sql
ALTER TABLE "AmenityBooking"
ADD CONSTRAINT "no_overlapping_bookings"
EXCLUDE USING gist (
  "amenityId" WITH =,
  tsrange("startsAt"::timestamp, "endsAt"::timestamp) WITH &&
)
WHERE ("status" = 'PENDING_APPROVAL' OR "status" = 'CONFIRMED' OR "status" = 'CHECKED_IN');
```

- **GiST Indexing**: Uses the PostgreSQL `btree_gist` extension to index scalar UUIDs alongside timestamp ranges.
- **Half-Open Intervals**: Standard `[start, end)` semantics permit back-to-back adjacent bookings (e.g. 10:00–11:00 and 11:00–12:00) without collision.
- **Error Mapping**: When a duplicate insert is attempted, PostgreSQL throws error code `23P01`. The backend error middleware catches this and responds with HTTP 409 `BOOKING_CONFLICT`.

### 3.2 Real-Time Event-Driven Cache Invalidation
Rather than relying on fragile optimistic UI mutations, EstateSync uses an event-driven cache invalidation pattern:
1. REST mutation commits change to PostgreSQL.
2. Server broadcasts a targeted WebSocket event to the appropriate room (`user:${userId}` or `property:${propertyId}`).
3. The client receives the event and invokes `queryClient.invalidateQueries()`.
4. TanStack Query automatically refetches the latest verified data from the database.

---

## 4. UI/UX & Design System

- **Clean Aesthetic**: Built with Tailwind CSS, utilizing slate neutrals, indigo primary actions, and semantic state badges (Emerald for Active/Confirmed, Amber for Pending, Rose for High/Urgent, Sky for In-Progress).
- **Responsive Layouts**: Fully responsive grid adapting smoothly from mobile devices to desktop viewports.
- **Interactive Modals**: Accessible dialogs with backdrop blur for booking creation, closures, unit addition, and staff invitation links.
- **Live Connection Indicator**: Visual header badge verifying active WebSocket connectivity.

---

## 5. Conclusion

EstateSync represents a complete, robust, and production-ready property management platform. By uniting multi-tenant property administration, auditable maintenance workflows, and a mathematically sound concurrency-safe booking engine, it delivers high reliability for owners, tenants, and facilities staff alike.
