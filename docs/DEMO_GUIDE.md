# Project Review & Demonstration Guide

This guide provides a structured walkthrough to demonstrate the core features of EstateSync during an evaluation or project presentation.

---

## 🚀 Live Demo URLs
- **Web Application**: [**http://localhost:5173**](http://localhost:5173)
- **API Health Check**: [**http://localhost:4000/api/health**](http://localhost:4000/api/health)

---

## 🎬 Step-by-Step Demonstration Script

### Walkthrough 1: One-Click Demo Logins & Owner Portfolio
1. Open [http://localhost:5173](http://localhost:5173).
2. Click the **"Owner Demo"** button on the landing page (auto-authenticates as `owner@example.com`).
3. **Owner Dashboard**:
   - Inspect portfolio KPI cards: Total Properties, Occupied Units, Active Requests, Overdue Maintenance (>48h).
   - Review the occupancy and ticket status charts powered by Recharts.
4. **Properties Page**:
   - Navigate to **"Properties"** via the sidebar.
   - Click into **"Grandview Heights"** to view units, active leases, and the staff roster.
   - Click **"Generate Invite"** to see the expiring, single-use token dialog for onboarding new staff or tenants.

---

### Walkthrough 2: Tenant Maintenance Request & Photo Upload
1. Log out via the top-right profile dropdown, or open an incognito window at [http://localhost:5173](http://localhost:5173).
2. Click **"Tenant 1 Demo"** (`tenant1@example.com`).
3. Notice the tenant dashboard showing their assigned residence: **Unit 101 at Grandview Heights**.
4. Navigate to **"Maintenance"** → click **"New Request"**.
5. Fill out the form:
   - **Title**: `Leaking bathroom faucet`
   - **Category**: `PLUMBING`
   - **Priority**: `HIGH`
   - **Description**: `Faucet drips continuously and water pressure is fluctuating.`
   - Attach a sample image file if desired.
6. Click **"Submit Request"**; notice the ticket appears immediately with status `PENDING`.

---

### Walkthrough 3: Staff Workflow & Phase 1 Immutability
1. Log out and click **"Staff Demo"** (`staff@example.com`).
2. The staff dashboard displays active assigned tickets and overdue items.
3. Open the newly submitted ticket:
   - Click **"Start Work"** (`IN_PROGRESS`). Notice the status badge and audit history update in real-time.
   - Add a progress comment: `"Inspected valve, replacing washer now."`
   - Click **"Mark Completed"** (`COMPLETED`).
4. Notice that once completed, edit controls disappear: Phase 1 enforces read-only integrity for completed maintenance requests.

---

### Walkthrough 4: Conflict-Free Amenity Booking & Exclusion Constraint
1. Log back in as **"Tenant 1"** (`tenant1@example.com`).
2. Navigate to **"Amenities"** → select **"Fitness Center"**.
3. Click **"Book Time Slot"**:
   - Pick a future date and time (e.g. 14:00 to 15:00).
   - Set attendees to `2`.
   - Click **"Confirm Booking"**. The booking is confirmed.
4. Now, open an incognito window and log in as **"Tenant 2"** (`tenant2@example.com`).
5. Navigate to **"Amenities"** → select **"Fitness Center"**.
6. Attempt to book an overlapping interval (e.g. 14:30 to 15:30):
   - Click **"Confirm Booking"**.
   - **Result**: The UI displays a clear conflict alert: *"This slot was just booked by another resident. Please select another time."*
   - This conflict is caught and enforced by the **PostgreSQL GiST exclusion constraint** (`23P01`).
7. Demonstrate adjacent slots: Have Tenant 2 book **15:00 to 16:00** (immediately following Tenant 1).
   - **Result**: The booking succeeds without conflict due to half-open interval semantics `[start, end)`.

---

### Walkthrough 5: Check-in / Check-out & Auto No-Show Cleanup
1. Log in as Tenant 1 and navigate to **"My Bookings"**.
2. Notice the **"Check In"** button is active during the booking window.
3. Clicking **"Check In"** records the exact arrival timestamp and switches status to `CHECKED_IN`.
4. Clicking **"Check Out"** finalizes the session early and marks it `COMPLETED`.
5. Background Scheduler: Unattended bookings past the grace period are automatically marked `NO_SHOW` by the background cleanup job.
