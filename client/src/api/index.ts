import { apiRequest } from './client.js';
import {
  User,
  Property,
  MaintenanceRequest,
  Amenity,
  AmenityBooking,
  Notification,
  Role,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
} from '../types/index.js';

// Auth API
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiRequest<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  registerOwner: (data: { name: string; email: string; password: string; phone?: string }) =>
    apiRequest<{ user: User; token: string }>('/api/auth/register-owner', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  registerWithInvite: (data: { token: string; name: string; email?: string; password: string; phone?: string }) =>
    apiRequest<{ user: User; token: string; property: Property }>('/api/auth/register-with-invite', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  logout: () => apiRequest<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),

  me: () => apiRequest<{ user: User }>('/api/auth/me'),
};

// Invitations API
export const invitationApi = {
  validate: (token: string) =>
    apiRequest<{ valid: boolean; role: Role; property: Property; unit?: any; reason?: string }>(
      `/api/invitations/validate?token=${encodeURIComponent(token)}`
    ),

  create: (propertyId: string, data: { role: Role; unitId?: string; expiresDays?: number }) =>
    apiRequest<{ id: string; token: string; invitationUrl: string; expiresAt: string }>(
      `/api/invitations/property/${propertyId}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    ),

  listByProperty: (propertyId: string) =>
    apiRequest<{ invitations: any[] }>(`/api/invitations/property/${propertyId}`),
};

// Properties API
export const propertyApi = {
  getOwnerProperties: () =>
    apiRequest<{ properties: Property[] }>('/api/properties'),

  getPropertyDetails: (id: string) =>
    apiRequest<{ property: Property }>(`/api/properties/${id}`),

  createProperty: (data: { name: string; address: string; description?: string; timeZone: string }) =>
    apiRequest<{ property: Property }>('/api/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createUnit: (propertyId: string, data: { unitNumber: string; floor?: number; description?: string }) =>
    apiRequest<{ unit: any }>(`/api/properties/${propertyId}/units`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  assignTenancy: (
    propertyId: string,
    data: { unitId: string; tenantEmail: string; startDate: string; endDate?: string }
  ) =>
    apiRequest<{ tenancy: any }>(`/api/properties/${propertyId}/tenancies`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  endTenancy: (propertyId: string, tenancyId: string) =>
    apiRequest<{ tenancy: any }>(`/api/properties/${propertyId}/tenancies/${tenancyId}`, {
      method: 'DELETE',
    }),

  addStaff: (propertyId: string, data: { staffEmail: string; roleTitle?: string }) =>
    apiRequest<{ staffMember: any }>(`/api/properties/${propertyId}/staff`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeStaff: (propertyId: string, staffId: string) =>
    apiRequest(`/api/properties/${propertyId}/staff/${staffId}`, {
      method: 'DELETE',
    }),

  getTenantTenancy: () =>
    apiRequest<{ tenancy: any }>('/api/properties/my-tenancy'),
};

// Maintenance API
export const maintenanceApi = {
  getRequests: (params?: {
    propertyId?: string;
    status?: MaintenanceStatus;
    category?: MaintenanceCategory;
    priority?: MaintenancePriority;
    search?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.propertyId) query.set('propertyId', params.propertyId);
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.priority) query.set('priority', params.priority);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return apiRequest<{ requests: MaintenanceRequest[] }>(`/api/maintenance${qs ? `?${qs}` : ''}`);
  },

  getRequestById: (id: string) =>
    apiRequest<{ request: MaintenanceRequest }>(`/api/maintenance/${id}`),

  createRequest: (formData: FormData) =>
    apiRequest<{ request: MaintenanceRequest }>('/api/maintenance', {
      method: 'POST',
      body: formData,
    }),

  updateStatus: (id: string, status: MaintenanceStatus, notes?: string) =>
    apiRequest<{ request: MaintenanceRequest }>(`/api/maintenance/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),

  assignStaff: (id: string, staffId: string | null) =>
    apiRequest<{ request: MaintenanceRequest }>(`/api/maintenance/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ staffId }),
    }),

  addComment: (id: string, message: string) =>
    apiRequest<{ comment: any }>(`/api/maintenance/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
};

// Amenities API
export const amenityApi = {
  getByProperty: (propertyId: string) =>
    apiRequest<{ amenities: Amenity[] }>(`/api/amenities/property/${propertyId}`),

  getById: (id: string) =>
    apiRequest<{ amenity: Amenity }>(`/api/amenities/${id}`),

  create: (data: any) =>
    apiRequest<{ amenity: Amenity }>('/api/amenities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiRequest<{ amenity: Amenity }>(`/api/amenities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  addClosure: (amenityId: string, data: { startsAt: string; endsAt: string; reason: string }) =>
    apiRequest<{ closure: any }>(`/api/amenities/${amenityId}/closures`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeClosure: (amenityId: string, closureId: string) =>
    apiRequest(`/api/amenities/${amenityId}/closures/${closureId}`, {
      method: 'DELETE',
    }),
};

// Bookings API
export const bookingApi = {
  getAvailability: (amenityId: string, startDate?: string, endDate?: string) => {
    const query = new URLSearchParams({ amenityId });
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);
    return apiRequest<{ amenity: any; reservedSlots: any[]; closures: any[] }>(
      `/api/bookings/availability?${query.toString()}`
    );
  },

  getTenantBookings: () =>
    apiRequest<{ bookings: AmenityBooking[] }>('/api/bookings/my-bookings'),

  getPropertyBookings: (propertyId: string) =>
    apiRequest<{ bookings: AmenityBooking[] }>(`/api/bookings/property/${propertyId}`),

  createBooking: (data: { amenityId: string; startsAt: string; endsAt: string; attendeeCount: number }) =>
    apiRequest<{ booking: AmenityBooking }>('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  checkIn: (id: string) =>
    apiRequest<{ booking: AmenityBooking }>(`/api/bookings/${id}/check-in`, { method: 'POST' }),

  checkOut: (id: string) =>
    apiRequest<{ booking: AmenityBooking }>(`/api/bookings/${id}/check-out`, { method: 'POST' }),

  cancelBooking: (id: string) =>
    apiRequest<{ booking: AmenityBooking }>(`/api/bookings/${id}/cancel`, { method: 'POST' }),

  approveBooking: (id: string) =>
    apiRequest<{ booking: AmenityBooking }>(`/api/bookings/${id}/approve`, { method: 'POST' }),

  rejectBooking: (id: string, reason: string) =>
    apiRequest<{ booking: AmenityBooking }>(`/api/bookings/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// Dashboards API
export const dashboardApi = {
  getOwnerDashboard: (propertyId?: string) =>
    apiRequest<any>(`/api/dashboards/owner${propertyId ? `?propertyId=${propertyId}` : ''}`),

  getTenantDashboard: () =>
    apiRequest<any>('/api/dashboards/tenant'),

  getStaffDashboard: () =>
    apiRequest<any>('/api/dashboards/staff'),
};

// Notifications API
export const notificationApi = {
  list: () =>
    apiRequest<{ notifications: Notification[]; unreadCount: number }>('/api/notifications'),

  markRead: (id: string) =>
    apiRequest(`/api/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    apiRequest('/api/notifications/mark-all-read', { method: 'POST' }),
};
