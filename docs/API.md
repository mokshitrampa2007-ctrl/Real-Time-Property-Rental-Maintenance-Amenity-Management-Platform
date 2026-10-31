# REST API Reference Documentation

## 1. Overview & Conventions

- **Base URL**: `http://localhost:4000/api`
- **Protocol**: HTTP/1.1 or HTTP/2
- **Data Format**: `application/json` (Multipart form-data for uploads)
- **Authentication**: Secure HttpOnly Session Cookie (`prop_mgmt_token`) or `Authorization: Bearer <token>`
- **Standard Error Response**:
```json
{
  "success": false,
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "The requested amenity slot is already booked."
  }
}
```

---

## 2. Authentication & Session Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new Owner account |
| `POST` | `/api/auth/login` | Public | Authenticate user; returns JWT & sets HttpOnly cookie |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile and roles |
| `POST` | `/api/auth/logout` | Authenticated | Invalidate session and clear auth cookie |

---

## 3. Invitation Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/invitations` | Owner | Create single-use expiring invitation token for staff or tenant |
| `GET` | `/api/invitations/:token` | Public | Validate invitation token and inspect role/property metadata |
| `POST` | `/api/invitations/accept` | Public | Complete registration using valid invite token |

---

## 4. Property & Rental Management

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/properties` | Authenticated | List properties accessible to the user |
| `POST` | `/api/properties` | Owner | Create a new property |
| `GET` | `/api/properties/:id` | Member | Retrieve property details including units and staff roster |
| `POST` | `/api/properties/:id/units` | Owner | Add unit with floor and number |
| `POST` | `/api/properties/:id/tenancies` | Owner | Assign tenant lease to an available unit |
| `DELETE` | `/api/properties/:id/tenancies/:tenancyId` | Owner | Terminate or end tenancy |
| `DELETE` | `/api/properties/:id/staff/:staffId` | Owner | Remove staff member from property roster |

---

## 5. Maintenance Requests

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/maintenance` | Authenticated | List tickets filtered by role, status, priority, and property |
| `POST` | `/api/maintenance` | Tenant | File ticket with category, priority, description, and photo files |
| `GET` | `/api/maintenance/:id` | Authorized | Retrieve ticket detail, status audit history, comments, and photos |
| `PATCH` | `/api/maintenance/:id/assign` | Owner | Assign maintenance staff member |
| `PATCH` | `/api/maintenance/:id/status` | Owner / Staff | Update status (`PENDING` → `IN_PROGRESS` → `COMPLETED`) |
| `POST` | `/api/maintenance/:id/comments` | Authorized | Post comment to ticket thread |

---

## 6. Amenity Management & Availability

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/amenities` | Member | List amenities for a property |
| `POST` | `/api/amenities` | Owner | Create shared amenity facility |
| `GET` | `/api/amenities/:id` | Member | Retrieve amenity details, operating hours, and active closures |
| `PUT` | `/api/amenities/:id` | Owner | Update amenity metadata, rules, or capacity |
| `GET` | `/api/amenities/:id/availability` | Member | Get computed availability slots for selected date |
| `POST` | `/api/amenities/:id/closures` | Owner | Schedule maintenance closure window |

---

## 7. Amenity Bookings & Check-in

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/bookings` | Authenticated | List bookings (Owner views property; Tenant views personal) |
| `POST` | `/api/bookings` | Tenant | Reserve amenity slot (Guarded by PostgreSQL Exclusion Constraint) |
| `POST` | `/api/bookings/:id/approve` | Owner | Approve pending booking reservation |
| `POST` | `/api/bookings/:id/reject` | Owner | Reject pending booking reservation |
| `POST` | `/api/bookings/:id/cancel` | Tenant / Owner | Cancel reservation before cutoff |
| `POST` | `/api/bookings/:id/check-in` | Tenant | Confirm arrival during scheduled booking grace window |
| `POST` | `/api/bookings/:id/check-out` | Tenant | Complete booking early |

---

## 8. Dashboards & Notifications

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboards/owner` | Owner | Portfolio analytics: occupancy rates, overdue tickets, bookings |
| `GET` | `/api/dashboards/tenant` | Tenant | Resident dashboard: active bookings, check-in banner, my tickets |
| `GET` | `/api/dashboards/staff` | Staff | Technician dashboard: assigned tasks, priority queue, completion rate |
| `GET` | `/api/notifications` | Authenticated | List user notifications |
| `PATCH` | `/api/notifications/:id/read` | Authenticated | Mark notification read |
| `PATCH` | `/api/notifications/read-all` | Authenticated | Mark all notifications read |
