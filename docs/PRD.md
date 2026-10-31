# Product Requirements Document (PRD)

## Project: Real-Time Property Rental, Maintenance & Amenity Management Platform (EstateSync)

### 1. Executive Summary
EstateSync is an integrated, real-time property management platform enabling property owners, residential tenants, and on-site maintenance staff to coordinate day-to-day operations seamlessly. The platform centralizes property tenancy records, maintenance request lifecycles with photo attachments and audit trails, and conflict-free shared amenity scheduling enforced at the database layer.

---

### 2. Objectives & Success Criteria
1. **Zero Booking Overlaps**: Eliminate double-booking incidents through database-level PostgreSQL GiST exclusion constraints on half-open timestamp ranges.
2. **Transparent Maintenance Tracking**: Provide real-time visibility into maintenance statuses (`PENDING`, `IN_PROGRESS`, `COMPLETED`), automatic 48-hour overdue detection, and real-time updates.
3. **Role-Based Isolation**: Strictly isolate data boundaries between property owners, tenants within a property, and assigned maintenance personnel.
4. **Real-Time Operational Awareness**: Broadcast updates via authenticated WebSockets (Socket.IO) to update client dashboards and notification feeds instantly without manual polling.

---

### 3. User Personas & Access Control

#### 3.1 Owner
- **Profile**: Real estate owners, property managers, or landlords managing multiple rental properties and residential units.
- **Key Responsibilities**:
  - Property & Unit Creation: Configure buildings, floors, unit numbers, and descriptions.
  - Tenancy Management: Assign tenants to specific units with validated start and end dates.
  - Staff Roster & Invitations: Generate secure, single-use, expiring invitation tokens for maintenance personnel and tenants.
  - Maintenance Triage: Review reported tickets, assign eligible maintenance staff, track progress, and inspect completed work.
  - Amenity Configuration: Define shared facilities, operating hours in the property timezone, advance booking rules, cancellation cutoffs, and closure periods.
  - Booking Approval: Review and approve/reject bookings requiring owner authorization.
  - Portfolio Analytics: Monitor occupancy rates, overdue tickets, and amenity utilization metrics.

#### 3.2 Tenant
- **Profile**: Verified residents residing in a leased unit at an owner's property.
- **Key Responsibilities**:
  - Tenancy Visibility: View active unit details, lease duration, and property information.
  - Maintenance Ticketing: Submit repair requests with categories, descriptions, priorities, and photo attachments.
  - Maintenance Tracking: Follow ticket progress in real-time, view assigned staff, and post comments.
  - Amenity Reservation: Browse property amenities, view real-time slot availability, reserve slots within permitted windows, and cancel eligible future bookings.
  - Check-in / Check-out: Confirm presence during booking intervals to avoid automated `NO_SHOW` flagging.
  - Notifications: Receive instant alerts when tickets change status or bookings are reviewed.

#### 3.3 Maintenance Staff
- **Profile**: Dedicated technicians, contractors, or facility managers assigned to one or more properties.
- **Key Responsibilities**:
  - Work Queue: Access a prioritized queue of maintenance requests assigned to them.
  - Status Transitions: Transition tickets from `PENDING` to `IN_PROGRESS` and `COMPLETED`.
  - Field Notes: Add comments and updates to tickets.
  - Real-Time Coordination: Receive instant alerts when new tickets are assigned or tenant comments are posted.

---

### 4. Detailed Feature Specifications

#### 4.1 Tenancy & Rental Management
- **Property Records**: Each property belongs to an owner, specifies an IANA timezone (e.g., `America/New_York`), physical address, and description.
- **Unit Exclusivity**: Duplicate unit numbers within the same property are forbidden.
- **Active Tenancy Invariant**: An exclusively leased unit cannot have overlapping active tenancies (`ACTIVE`).

#### 4.2 Maintenance Lifecycle
- **Statuses**: `PENDING` → `IN_PROGRESS` → `COMPLETED`.
- **Phase 1 Immutability**: Once marked `COMPLETED`, a ticket becomes read-only to preserve audit integrity. Re-opening is deferred to subsequent phases.
- **48-Hour Overdue SLA**: Any ticket that remains unresolved (`PENDING` or `IN_PROGRESS`) for longer than 48 hours is automatically flagged as overdue in all owner and staff dashboards.
- **Audit History**: Every status transition generates an immutable `MaintenanceStatusHistory` log detailing timestamp, previous status, new status, and the acting user ID.
- **Photo Attachments**: Tenants can upload JPG, PNG, and WebP images during ticket creation. Files are validated for MIME type, sanitized with random UUID filenames, and stored locally or on AWS S3.

#### 4.3 Amenity Management & Conflict-Free Booking Engine
- **Exclusive Booking Model**: In Phase 1, each booking exclusively reserves the amenity for that time interval.
- **Capacity Limits**: The `capacity` attribute limits the number of attendees for a reservation, but does not allow concurrent simultaneous bookings.
- **Interval Logic**: Bookings follow half-open intervals `[start, end)`. Two adjacent reservations (e.g., 14:00–15:00 and 15:00–16:00) do not overlap.
- **Blocking States**:
  - `PENDING_APPROVAL`: The requested slot is held so no other tenant can reserve it while pending review.
  - `CONFIRMED`: Approved/confirmed reservation.
  - `CHECKED_IN`: Active check-in during the scheduled interval.
- **Non-Blocking States**:
  - `REJECTED`: Request rejected by owner; immediately releases the slot.
  - `CANCELLED`: Tenant cancelled before the cancellation cutoff; immediately releases the slot.
  - `COMPLETED`: Booking ended successfully.
  - `NO_SHOW`: Tenant failed to check in within the grace period; slot is freed.
- **Database Concurrency Guarantee**: PostgreSQL GiST exclusion constraint (`no_overlapping_bookings`) catches race conditions atomically and responds with HTTP 409 `BOOKING_CONFLICT`.

---

### 5. Out of Scope (Phase 1 Explicit Boundaries)
- Rental payment processing and gateway integrations (e.g., Stripe, Plaid).
- Native iOS/Android mobile builds (responsive web only).
- AI/ML-driven predictive maintenance or automated diagnostics.
- IoT smart lock integrations or hardware sensor connectivity.
- Public marketplace or listing syndication (Zillow, Apartments.com).
