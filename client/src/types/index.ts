export type Role = 'OWNER' | 'TENANT' | 'STAFF';

export type TenancyStatus = 'ACTIVE' | 'ENDED' | 'TERMINATED';

export type MaintenanceCategory =
  | 'PLUMBING'
  | 'ELECTRICAL'
  | 'HVAC'
  | 'APPLIANCE'
  | 'STRUCTURAL'
  | 'PEST_CONTROL'
  | 'GENERAL';

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export type BookingStatus =
  | 'PENDING_APPROVAL'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'CHECKED_IN'
  | 'COMPLETED'
  | 'NO_SHOW';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  createdAt?: string;
  ownedProperties?: Property[];
  tenancies?: Tenancy[];
  staffMemberships?: PropertyStaff[];
}

export interface Property {
  id: string;
  ownerId: string;
  name: string;
  address: string;
  description?: string | null;
  timeZone: string;
  createdAt: string;
  units?: Unit[];
  amenities?: Amenity[];
  staffMembers?: PropertyStaff[];
  _count?: {
    units: number;
    amenities: number;
    maintenanceRequests: number;
    staffMembers: number;
  };
}

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  floor: number;
  description?: string | null;
  tenancies?: Tenancy[];
}

export interface Tenancy {
  id: string;
  tenantId: string;
  unitId: string;
  propertyId: string;
  startDate: string;
  endDate?: string | null;
  status: TenancyStatus;
  tenant?: User;
  unit?: Unit;
  property?: Property;
}

export interface PropertyStaff {
  id: string;
  propertyId: string;
  staffId: string;
  roleTitle?: string | null;
  staff?: User;
  property?: Property;
}

export interface MaintenanceAttachment {
  id: string;
  requestId: string;
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface MaintenanceComment {
  id: string;
  requestId: string;
  authorId: string;
  message: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    role: Role;
  };
}

export interface MaintenanceStatusHistory {
  id: string;
  requestId: string;
  previousStatus: MaintenanceStatus;
  newStatus: MaintenanceStatus;
  changedById: string;
  notes?: string | null;
  createdAt: string;
  changedBy: {
    id: string;
    name: string;
    role: Role;
  };
}

export interface MaintenanceRequest {
  id: string;
  tenantId: string;
  propertyId: string;
  unitId: string;
  assignedStaffId?: string | null;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  tenant: { id: string; name: string; email: string; phone?: string | null };
  property: { id: string; name: string; timeZone: string; ownerId?: string; staffMembers?: Array<{ staff: User; roleTitle?: string }> };
  unit: { id: string; unitNumber: string; floor: number };
  assignedStaff?: { id: string; name: string; email: string; phone?: string | null } | null;
  comments?: MaintenanceComment[];
  attachments?: MaintenanceAttachment[];
  statusHistory?: MaintenanceStatusHistory[];
  isOverdue?: boolean;
  hoursElapsed?: number;
  resolutionHours?: number | null;
  _count?: {
    comments: number;
    attachments: number;
  };
}

export interface OperatingHours {
  id: string;
  amenityId: string;
  weekday: number;
  openingTime: string;
  closingTime: string;
}

export interface AmenityClosure {
  id: string;
  amenityId: string;
  startsAt: string;
  endsAt: string;
  reason: string;
}

export interface Amenity {
  id: string;
  propertyId: string;
  name: string;
  description?: string | null;
  location?: string | null;
  capacity: number;
  active: boolean;
  approvalRequired: boolean;
  slotDurationMinutes: number;
  minimumBookingMinutes: number;
  maximumBookingMinutes: number;
  advanceBookingDays: number;
  cancellationCutoffMinutes: number;
  checkInGraceMinutes: number;
  operatingHours: OperatingHours[];
  closures?: AmenityClosure[];
  property?: { id: string; name: string; timeZone: string };
}

export interface AmenityBooking {
  id: string;
  amenityId: string;
  tenantId: string;
  propertyId: string;
  startsAt: string;
  endsAt: string;
  attendeeCount: number;
  status: BookingStatus;
  rejectionReason?: string | null;
  actualCheckInAt?: string | null;
  actualCheckOutAt?: string | null;
  createdAt: string;
  amenity: Amenity;
  tenant?: { id: string; name: string; email: string; phone?: string | null };
  canCheckIn?: boolean;
  canCheckOut?: boolean;
  canCancel?: boolean;
  isOverdueCheckOut?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  propertyId?: string | null;
  metadata?: string | null;
  createdAt: string;
  actor?: { id: string; name: string; role: Role } | null;
}
