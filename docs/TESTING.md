# Quality Assurance & Testing Documentation

## 1. Testing Philosophy & Test Bed

EstateSync employs integration tests executed against a **real PostgreSQL database** rather than mocks or in-memory emulators. This ensures that:
1. Native PostgreSQL GiST index expressions and exclusion constraints (`no_overlapping_bookings`) are actively tested.
2. Complex multi-table foreign keys and cascade rules behave identically to production.
3. Express middleware pipelines, Supertest cookie handling, and Zod schemas are validated end-to-end.

---

## 2. Test Execution Command

Run the full automated test suite:
```bash
npm test
```

---

## 3. Test Suites Breakdown

### 3.1 Authentication & Authorization (`server/tests/auth.test.ts`)
- `should successfully log in demo owner with valid credentials`: Verifies JWT generation, user payload, and HttpOnly `prop_mgmt_token` cookie.
- `should reject login with invalid password`: Verifies bcrypt comparison failure, returning HTTP 401 `INVALID_CREDENTIALS`.
- `should return current user profile on /api/auth/me`: Verifies session persistence across authenticated requests.
- `should prevent tenants from accessing owner property endpoints`: Verifies role-based access control, returning HTTP 403 `FORBIDDEN`.
- `should successfully register a new owner`: Verifies owner onboarding flow and immediate session issuance.

### 3.2 Maintenance Workflow & SLAs (`server/tests/maintenance.test.ts`)
- `should allow a tenant to submit a maintenance request`: Verifies ticket creation with priority and category.
- `should allow owner to assign staff to a maintenance request`: Verifies staff assignment to tickets.
- `should allow assigned staff to transition status to IN_PROGRESS`: Verifies staff status updates.
- `should allow assigned staff to transition status to COMPLETED`: Verifies ticket completion and timestamp recording.
- `should make completed maintenance request read-only in Phase 1`: Verifies that subsequent update attempts return HTTP 400 `READ_ONLY`.
- `should flag unresolved tickets older than 48 hours as overdue`: Verifies automatic overdue calculation.
- `should prevent tenant from accessing another tenant private request`: Verifies tenant privacy boundaries.

### 3.3 Concurrency & Database Exclusion Constraints (`server/tests/bookings.test.ts`)
- `should successfully create a valid non-overlapping booking`: Verifies standard reservation flow.
- `should REJECT an overlapping booking attempt with HTTP 409 Conflict`: Verifies database-level GiST exclusion constraint (`23P01`).
- `should ALLOW adjacent back-to-back bookings`: Verifies half-open intervals `[start, end)`.
- `should atomically handle simultaneous concurrent booking attempts so exactly one succeeds`: Verifies race condition handling with simultaneous requests.
- `should free the slot when a confirmed booking is cancelled`: Verifies slot release upon cancellation.
- `should reject booking when attendee count exceeds amenity capacity`: Verifies capacity validation.
- `should reject tenant booking when outside amenity operating hours`: Verifies operating hours validation.

---

## 4. Test Verification Summary

```text
 ✓ server/tests/auth.test.ts (5 tests)
 ✓ server/tests/maintenance.test.ts (7 tests)
 ✓ server/tests/bookings.test.ts (7 tests)

 Test Files  3 passed (3)
      Tests  19 passed (19)
   Duration  ~22s (real database execution)
```
