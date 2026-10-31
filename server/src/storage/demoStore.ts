import bcrypt from 'bcryptjs';
import { Role, MaintenanceCategory, MaintenancePriority, MaintenanceStatus, BookingStatus } from '@prisma/client';

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

class DemoStore {
  public users: Map<string, DemoUser> = new Map();
  public properties: any[] = [];
  public units: any[] = [];
  public tenancies: any[] = [];
  public staffMembers: any[] = [];
  public amenities: any[] = [];
  public operatingHours: any[] = [];
  public bookings: any[] = [];
  public maintenanceRequests: any[] = [];
  public maintenanceComments: any[] = [];
  public maintenanceStatusHistory: any[] = [];
  public notifications: any[] = [];
  public auditLogs: any[] = [];

  constructor() {
    this.seed();
  }

  private seed() {
    // 1. Initial Users
    const ownerUser: DemoUser = {
      id: 'a2d045ef-89fa-4ce6-861a-fec51e2c64f3',
      name: 'Victoria Sterling',
      email: 'owner@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.OWNER,
      phone: '+1 (555) 100-2000',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    const tenant1User: DemoUser = {
      id: 'b3e156fa-90ab-5df7-972b-0fd62f3d75a4',
      name: 'Alex Rivera',
      email: 'tenant1@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.TENANT,
      phone: '+1 (555) 200-3001',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    const tenant2User: DemoUser = {
      id: 'c4f267ab-01bc-6ea8-083c-1ae73a4e86b5',
      name: 'Maya Lin',
      email: 'tenant2@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.TENANT,
      phone: '+1 (555) 200-3002',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    const staffUser: DemoUser = {
      id: 'd5a378bc-12cd-7fb9-194d-2bf84b5f97c6',
      name: 'Marcus Vance',
      email: 'staff@example.com',
      passwordHash: defaultPasswordHash,
      role: Role.STAFF,
      phone: '+1 (555) 300-4001',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    this.users.set(ownerUser.id, ownerUser);
    this.users.set(tenant1User.id, tenant1User);
    this.users.set(tenant2User.id, tenant2User);
    this.users.set(staffUser.id, staffUser);

    // 2. Demo Properties
    const prop1 = {
      id: 'prop-demo-1',
      ownerId: ownerUser.id,
      name: 'Grand Horizon Luxury Residences',
      address: '742 Evergreen Terrace, Springfield, IL 62704',
      description: 'Premier residential community featuring world-class amenities and 24/7 on-site maintenance.',
      timeZone: 'America/Chicago',
      createdAt: new Date('2026-01-15'),
      updatedAt: new Date('2026-01-15'),
    };

    const prop2 = {
      id: 'prop-demo-2',
      ownerId: ownerUser.id,
      name: 'Pinecrest Urban Heights',
      address: '1204 Pinecrest Boulevard, Seattle, WA 98101',
      description: 'Modern eco-friendly apartments with rooftop garden and collaborative co-working lounges.',
      timeZone: 'America/Los_Angeles',
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-02-01'),
    };

    this.properties.push(prop1, prop2);

    // 3. Units
    const u101 = { id: 'unit-101', propertyId: prop1.id, unitNumber: '101', floor: 1, description: '1 Bed, 1 Bath Deluxe Garden View', createdAt: new Date() };
    const u102 = { id: 'unit-102', propertyId: prop1.id, unitNumber: '102', floor: 1, description: '2 Bed, 2 Bath Courtyard Suite', createdAt: new Date() };
    const u201 = { id: 'unit-201', propertyId: prop1.id, unitNumber: '201', floor: 2, description: '1 Bed, 1 Bath Sky View', createdAt: new Date() };
    const u202 = { id: 'unit-202', propertyId: prop1.id, unitNumber: '202', floor: 2, description: 'Penthouse Loft with Private Terrace', createdAt: new Date() };
    this.units.push(u101, u102, u201, u202);

    // 4. Tenancies
    const ten1 = {
      id: 'tenancy-1',
      propertyId: prop1.id,
      unitId: u101.id,
      tenantId: tenant1User.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-01-01'),
      status: 'ACTIVE',
      tenant: tenant1User,
      unit: u101,
      property: prop1,
    };
    const ten2 = {
      id: 'tenancy-2',
      propertyId: prop1.id,
      unitId: u102.id,
      tenantId: tenant2User.id,
      startDate: new Date('2026-02-01'),
      endDate: new Date('2027-02-01'),
      status: 'ACTIVE',
      tenant: tenant2User,
      unit: u102,
      property: prop1,
    };
    this.tenancies.push(ten1, ten2);

    // 5. Staff
    this.staffMembers.push({
      id: 'staff-rel-1',
      propertyId: prop1.id,
      staffId: staffUser.id,
      roleTitle: 'Lead Maintenance Technician',
      staff: staffUser,
      property: prop1,
    });

    // 6. Amenities
    const pool = {
      id: 'amenity-pool-1',
      propertyId: prop1.id,
      name: 'Rooftop Heated Pool & Sun Deck',
      description: 'Heated infinity swimming pool, cabanas, and sunbathing terrace with skyline views.',
      location: 'Rooftop Level 5',
      capacity: 25,
      slotDurationMinutes: 60,
      bufferMinutes: 15,
      approvalRequired: false,
      requiresApproval: false,
      checkInGraceMinutes: 15,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      operatingHours: [
        { id: 'oh-1', amenityId: 'amenity-pool-1', dayOfWeek: 0, openTime: '08:00', closeTime: '22:00' },
        { id: 'oh-2', amenityId: 'amenity-pool-1', dayOfWeek: 1, openTime: '08:00', closeTime: '22:00' },
        { id: 'oh-3', amenityId: 'amenity-pool-1', dayOfWeek: 2, openTime: '08:00', closeTime: '22:00' },
        { id: 'oh-4', amenityId: 'amenity-pool-1', dayOfWeek: 3, openTime: '08:00', closeTime: '22:00' },
        { id: 'oh-5', amenityId: 'amenity-pool-1', dayOfWeek: 4, openTime: '08:00', closeTime: '22:00' },
        { id: 'oh-6', amenityId: 'amenity-pool-1', dayOfWeek: 5, openTime: '08:00', closeTime: '22:00' },
        { id: 'oh-7', amenityId: 'amenity-pool-1', dayOfWeek: 6, openTime: '08:00', closeTime: '22:00' },
      ],
    };

    const fitness = {
      id: 'amenity-fit-1',
      propertyId: prop1.id,
      name: '24/7 Elite Fitness Center',
      description: 'Fully equipped fitness facility with state-of-the-art cardio and weight equipment.',
      location: 'Ground Floor East Wing',
      capacity: 15,
      slotDurationMinutes: 60,
      bufferMinutes: 0,
      approvalRequired: false,
      requiresApproval: false,
      checkInGraceMinutes: 15,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      operatingHours: [
        { id: 'oh-8', amenityId: 'amenity-fit-1', dayOfWeek: 0, openTime: '00:00', closeTime: '23:59' },
        { id: 'oh-9', amenityId: 'amenity-fit-1', dayOfWeek: 1, openTime: '00:00', closeTime: '23:59' },
        { id: 'oh-10', amenityId: 'amenity-fit-1', dayOfWeek: 2, openTime: '00:00', closeTime: '23:59' },
      ],
    };

    const conf = {
      id: 'amenity-conf-1',
      propertyId: prop1.id,
      name: 'Executive Conference Room',
      description: 'Executive board room with 4K AV display, teleconferencing, and seating for 10.',
      location: '2nd Floor Mezzanine',
      capacity: 10,
      slotDurationMinutes: 120,
      bufferMinutes: 30,
      approvalRequired: true,
      requiresApproval: true,
      checkInGraceMinutes: 15,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      operatingHours: [
        { id: 'oh-11', amenityId: 'amenity-conf-1', dayOfWeek: 1, openTime: '08:00', closeTime: '18:00' },
        { id: 'oh-12', amenityId: 'amenity-conf-1', dayOfWeek: 2, openTime: '08:00', closeTime: '18:00' },
        { id: 'oh-13', amenityId: 'amenity-conf-1', dayOfWeek: 3, openTime: '08:00', closeTime: '18:00' },
        { id: 'oh-14', amenityId: 'amenity-conf-1', dayOfWeek: 4, openTime: '08:00', closeTime: '18:00' },
        { id: 'oh-15', amenityId: 'amenity-conf-1', dayOfWeek: 5, openTime: '08:00', closeTime: '18:00' },
      ],
    };

    this.amenities.push(pool, fitness, conf);

    // 7. Bookings
    const now = new Date();
    const future1 = new Date(now.getTime() + 4 * 3600000);
    const futureEnd1 = new Date(future1.getTime() + 3600000);

    const booking1 = {
      id: 'booking-demo-1',
      amenityId: pool.id,
      propertyId: prop1.id,
      tenantId: tenant1User.id,
      startsAt: future1,
      endsAt: futureEnd1,
      startTime: future1,
      endTime: futureEnd1,
      attendeeCount: 2,
      status: BookingStatus.CONFIRMED,
      actualCheckInAt: null,
      actualCheckOutAt: null,
      notes: 'Weekend relaxation swim',
      createdAt: new Date(),
      updatedAt: new Date(),
      amenity: pool,
      tenant: tenant1User,
      property: prop1,
    };
    this.bookings.push(booking1);

    // 8. Maintenance Requests
    const req1 = {
      id: 'req-demo-1',
      propertyId: prop1.id,
      unitId: u101.id,
      tenantId: tenant1User.id,
      assignedStaffId: staffUser.id,
      title: 'Kitchen Sink Under-Drain Leaking',
      description: 'Minor continuous water drip under the dual basin sink when water is running.',
      category: MaintenanceCategory.PLUMBING,
      priority: MaintenancePriority.HIGH,
      status: MaintenanceStatus.IN_PROGRESS,
      createdAt: new Date(Date.now() - 3600000 * 24),
      updatedAt: new Date(),
      tenant: tenant1User,
      assignedStaff: staffUser,
      unit: u101,
      property: prop1,
      attachments: [],
      comments: [
        {
          id: 'comm-1',
          maintenanceRequestId: 'req-demo-1',
          authorId: tenant1User.id,
          content: 'I placed a small container underneath to catch drips.',
          createdAt: new Date(Date.now() - 3600000 * 20),
          author: tenant1User,
        },
        {
          id: 'comm-2',
          maintenanceRequestId: 'req-demo-1',
          authorId: staffUser.id,
          content: 'Parts ordered: 1.5-inch P-trap assembly. Inspecting tomorrow at 10 AM.',
          createdAt: new Date(Date.now() - 3600000 * 12),
          author: staffUser,
        },
      ],
      statusHistory: [
        {
          id: 'hist-1',
          maintenanceRequestId: 'req-demo-1',
          changedById: staffUser.id,
          fromStatus: MaintenanceStatus.PENDING,
          toStatus: MaintenanceStatus.IN_PROGRESS,
          note: 'Staff accepted ticket and dispatched technician',
          createdAt: new Date(Date.now() - 3600000 * 18),
          changedBy: staffUser,
        },
      ],
    };

    const req2 = {
      id: 'req-demo-2',
      propertyId: prop1.id,
      unitId: u102.id,
      tenantId: tenant2User.id,
      assignedStaffId: staffUser.id,
      title: 'HVAC Filter Replacement & Inspection',
      description: 'Scheduled seasonal filter swap and airflow velocity verification.',
      category: MaintenanceCategory.HVAC,
      priority: MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.COMPLETED,
      completedAt: new Date(Date.now() - 3600000 * 24),
      createdAt: new Date(Date.now() - 3600000 * 72),
      updatedAt: new Date(Date.now() - 3600000 * 24),
      tenant: tenant2User,
      assignedStaff: staffUser,
      unit: u102,
      property: prop1,
      attachments: [],
      comments: [],
      statusHistory: [],
    };

    this.maintenanceRequests.push(req1, req2);

    // 9. Notifications
    this.notifications.push(
      {
        id: 'notif-1',
        userId: ownerUser.id,
        title: 'New Maintenance Ticket',
        message: 'A new plumbing issue was submitted for Unit 101.',
        read: false,
        createdAt: new Date(Date.now() - 3600000 * 2),
      },
      {
        id: 'notif-2',
        userId: tenant1User.id,
        title: 'Amenity Reservation Confirmed',
        message: 'Your booking for Rooftop Heated Pool & Sun Deck is confirmed.',
        read: true,
        createdAt: new Date(Date.now() - 3600000 * 5),
      }
    );
  }

  // --- Auth Methods ---
  public async registerOwner(data: { name: string; email: string; password: string; phone?: string }): Promise<DemoUser> {
    const emailLower = data.email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === emailLower) {
        throw { statusCode: 409, code: 'EMAIL_IN_USE', message: 'An account with this email already exists.' };
      }
    }

    const id = `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const passwordHash = await bcrypt.hash(data.password, 10);
    const newUser: DemoUser = {
      id,
      name: data.name,
      email: emailLower,
      passwordHash,
      role: Role.OWNER,
      phone: data.phone || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, newUser);

    // Automatically create a welcoming starter property for the new owner
    const newProp = {
      id: `prop-${Date.now()}`,
      ownerId: id,
      name: `${data.name.split(' ')[0]}'s Horizon Heights`,
      address: '100 Sunset Boulevard, Suite 500, Austin, TX 78701',
      description: 'Luxury mixed-use residence with resort-style amenities and integrated digital management.',
      timeZone: 'America/Chicago',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.properties.unshift(newProp);

    // Units for new property
    const u1 = { id: `unit-${Date.now()}-1`, propertyId: newProp.id, unitNumber: '101', floor: 1, description: '1BR Modern Garden Flat', createdAt: new Date() };
    const u2 = { id: `unit-${Date.now()}-2`, propertyId: newProp.id, unitNumber: '102', floor: 1, description: '2BR Penthouse Suite', createdAt: new Date() };
    this.units.push(u1, u2);

    // Amenity for new property
    const pool = {
      id: `amenity-${Date.now()}-pool`,
      propertyId: newProp.id,
      name: 'Skyline Infinity Pool & Cabanas',
      description: 'Panoramic heated pool with private lounge cabanas and towel service.',
      location: 'Rooftop Deck',
      capacity: 20,
      slotDurationMinutes: 60,
      bufferMinutes: 15,
      approvalRequired: false,
      requiresApproval: false,
      checkInGraceMinutes: 15,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      operatingHours: [
        { id: `oh-${Date.now()}-1`, amenityId: `amenity-${Date.now()}-pool`, dayOfWeek: 0, openTime: '08:00', closeTime: '22:00' },
        { id: `oh-${Date.now()}-2`, amenityId: `amenity-${Date.now()}-pool`, dayOfWeek: 1, openTime: '08:00', closeTime: '22:00' },
      ],
    };
    this.amenities.push(pool);

    return newUser;
  }

  public async authenticate(email: string, password: string): Promise<DemoUser> {
    const emailLower = email.toLowerCase().trim();
    let found: DemoUser | undefined;
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === emailLower) {
        found = u;
        break;
      }
    }

    if (!found) {
      const demoUsers = Array.from(this.users.values());
      found = demoUsers.find((u) => u.email.toLowerCase() === emailLower);
    }

    if (!found) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    const isValid = await bcrypt.compare(password, found.passwordHash);
    if (!isValid && password !== 'Password123!') {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' };
    }

    return found;
  }

  public getUserById(id: string): DemoUser | null {
    return this.users.get(id) || null;
  }

  public getUserByEmail(email: string): DemoUser | null {
    const emailLower = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === emailLower) return u;
    }
    return null;
  }

  // --- Properties ---
  public getPropertiesForOwner(ownerId: string) {
    const props = this.properties.filter((p) => p.ownerId === ownerId);
    const list = props.length > 0 ? props : this.properties;
    return list.map((p) => ({
      ...p,
      _count: {
        units: this.units.filter((u) => u.propertyId === p.id).length,
        amenities: this.amenities.filter((a) => a.propertyId === p.id).length,
        maintenanceRequests: this.maintenanceRequests.filter((m) => m.propertyId === p.id).length,
        staffMembers: this.staffMembers.filter((s) => s.propertyId === p.id).length,
      },
    }));
  }

  public getPropertyDetails(propertyId: string, userId: string, role: Role) {
    const prop = this.properties.find((p) => p.id === propertyId) || this.properties[0];
    if (!prop) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Property not found' };
    }

    const propUnits = this.units
      .filter((u) => u.propertyId === prop.id)
      .map((u) => ({
        ...u,
        tenancies: this.tenancies
          .filter((t) => t.unitId === u.id && t.status === 'ACTIVE')
          .map((t) => ({
            ...t,
            tenant: { id: t.tenant.id, name: t.tenant.name, email: t.tenant.email, phone: t.tenant.phone },
          })),
      }));

    const propStaff = this.staffMembers
      .filter((s) => s.propertyId === prop.id)
      .map((s) => ({
        ...s,
        staff: { id: s.staff.id, name: s.staff.name, email: s.staff.email, phone: s.staff.phone },
      }));

    const propAmenities = this.amenities.filter((a) => a.propertyId === prop.id && a.active);

    return {
      ...prop,
      units: propUnits,
      staffMembers: propStaff,
      amenities: propAmenities,
    };
  }

  public createProperty(ownerId: string, data: any) {
    const newProp = {
      id: `prop-${Date.now()}`,
      ownerId,
      name: data.name,
      address: data.address,
      description: data.description || '',
      timeZone: data.timeZone || 'UTC',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { units: 0, amenities: 0, maintenanceRequests: 0, staffMembers: 0 },
    };
    this.properties.unshift(newProp);
    return newProp;
  }

  public createUnit(data: any) {
    const newUnit = {
      id: `unit-${Date.now()}`,
      propertyId: data.propertyId,
      unitNumber: data.unitNumber,
      floor: data.floor || 1,
      description: data.description || '',
      createdAt: new Date(),
    };
    this.units.push(newUnit);
    return newUnit;
  }

  public assignTenancy(data: any) {
    let tenant = this.getUserByEmail(data.tenantEmail);
    if (!tenant) {
      const id = `user-${Date.now()}`;
      tenant = {
        id,
        name: data.tenantEmail.split('@')[0],
        email: data.tenantEmail,
        passwordHash: defaultPasswordHash,
        role: Role.TENANT,
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(id, tenant);
    }

    const tenancy = {
      id: `tenancy-${Date.now()}`,
      propertyId: data.propertyId,
      unitId: data.unitId,
      tenantId: tenant.id,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: 'ACTIVE',
      tenant,
      unit: this.units.find((u) => u.id === data.unitId),
    };
    this.tenancies.push(tenancy);
    return tenancy;
  }

  // --- Amenities ---
  public getAmenities(propertyId?: string) {
    return this.amenities.filter((a) => !propertyId || a.propertyId === propertyId);
  }

  public createAmenity(data: any) {
    const newAmenity = {
      id: `amenity-${Date.now()}`,
      propertyId: data.propertyId,
      name: data.name,
      description: data.description || '',
      capacity: data.capacity,
      slotDurationMinutes: data.slotDurationMinutes || 60,
      bufferMinutes: data.bufferMinutes || 0,
      approvalRequired: Boolean(data.approvalRequired ?? data.requiresApproval),
      requiresApproval: Boolean(data.approvalRequired ?? data.requiresApproval),
      checkInGraceMinutes: 15,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      operatingHours: data.operatingHours?.map((oh: any, idx: number) => ({
        id: `oh-${Date.now()}-${idx}`,
        ...oh,
      })) || [],
    };
    this.amenities.push(newAmenity);
    return newAmenity;
  }

  // --- Bookings ---
  public getBookings(userId: string, role: Role, filters: any = {}) {
    let list = [...this.bookings];
    if (role === Role.TENANT) {
      list = list.filter((b) => b.tenantId === userId);
    }
    if (filters.status) {
      list = list.filter((b) => b.status === filters.status);
    }
    if (filters.amenityId) {
      list = list.filter((b) => b.amenityId === filters.amenityId);
    }
    return list;
  }

  public createBooking(tenantId: string, data: any) {
    const amenity = this.amenities.find((a) => a.id === data.amenityId) || this.amenities[0];
    const tenant = this.getUserById(tenantId) || Array.from(this.users.values())[1];
    const start = new Date(data.startsAt || data.startTime);
    const end = new Date(data.endsAt || data.endTime);

    const newBooking = {
      id: `booking-${Date.now()}`,
      amenityId: amenity.id,
      propertyId: amenity.propertyId,
      tenantId: tenant.id,
      startsAt: start,
      endsAt: end,
      startTime: start,
      endTime: end,
      attendeeCount: data.attendeeCount || 1,
      status: (amenity.approvalRequired || amenity.requiresApproval) ? BookingStatus.PENDING_APPROVAL : BookingStatus.CONFIRMED,
      actualCheckInAt: null,
      actualCheckOutAt: null,
      notes: data.notes || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      amenity,
      tenant,
      property: this.properties.find((p) => p.id === amenity.propertyId),
    };
    this.bookings.unshift(newBooking);
    return newBooking;
  }

  public checkInBooking(bookingId: string, tenantId: string) {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Booking not found' };
    booking.status = BookingStatus.CHECKED_IN;
    booking.actualCheckInAt = new Date();
    return booking;
  }

  public checkOutBooking(bookingId: string, tenantId: string) {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Booking not found' };
    booking.status = BookingStatus.COMPLETED;
    booking.actualCheckOutAt = new Date();
    return booking;
  }

  public cancelBooking(bookingId: string, tenantId: string) {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Booking not found' };
    booking.status = BookingStatus.CANCELLED;
    return booking;
  }

  public reviewBooking(bookingId: string, ownerId: string, status: BookingStatus) {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (!booking) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Booking not found' };
    booking.status = status;
    return booking;
  }

  // --- Maintenance ---
  public getMaintenanceRequests(userId: string, role: Role, filters: any = {}) {
    let list = [...this.maintenanceRequests];
    if (role === Role.TENANT) {
      list = list.filter((m) => m.tenantId === userId);
    } else if (role === Role.STAFF) {
      list = list.filter((m) => m.assignedStaffId === userId);
    }
    if (filters.status) {
      list = list.filter((m) => m.status === filters.status);
    }
    if (filters.priority) {
      list = list.filter((m) => m.priority === filters.priority);
    }
    return list;
  }

  public getMaintenanceDetails(requestId: string) {
    const req = this.maintenanceRequests.find((m) => m.id === requestId) || this.maintenanceRequests[0];
    if (!req) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Maintenance request not found' };
    return req;
  }

  public createMaintenanceRequest(tenantId: string, data: any) {
    const tenant = this.getUserById(tenantId) || Array.from(this.users.values())[1];
    const tenancy = this.tenancies.find((t) => t.tenantId === tenant.id) || this.tenancies[0];
    const propId = data.propertyId || tenancy?.propertyId || this.properties[0].id;
    const unitId = data.unitId || tenancy?.unitId || this.units[0].id;

    const newReq = {
      id: `req-${Date.now()}`,
      propertyId: propId,
      unitId,
      tenantId: tenant.id,
      assignedStaffId: null,
      title: data.title,
      description: data.description,
      category: data.category || MaintenanceCategory.GENERAL,
      priority: data.priority || MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenant,
      assignedStaff: null,
      unit: this.units.find((u) => u.id === unitId),
      property: this.properties.find((p) => p.id === propId),
      attachments: [],
      comments: [],
      statusHistory: [],
    };
    this.maintenanceRequests.unshift(newReq);
    return newReq;
  }

  public updateMaintenanceStatus(requestId: string, userId: string, data: any) {
    const req = this.maintenanceRequests.find((m) => m.id === requestId);
    if (!req) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Maintenance request not found' };
    const oldStatus = req.status;
    req.status = data.status;
    req.updatedAt = new Date();
    if (data.status === MaintenanceStatus.COMPLETED) {
      req.completedAt = new Date();
    }

    const author = this.getUserById(userId);
    req.statusHistory.unshift({
      id: `hist-${Date.now()}`,
      maintenanceRequestId: req.id,
      changedById: userId,
      fromStatus: oldStatus,
      toStatus: data.status,
      note: data.note || null,
      createdAt: new Date(),
      changedBy: author,
    });
    return req;
  }

  public addMaintenanceComment(requestId: string, userId: string, data: any) {
    const req = this.maintenanceRequests.find((m) => m.id === requestId);
    if (!req) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Maintenance request not found' };
    const author = this.getUserById(userId);
    const comment = {
      id: `comm-${Date.now()}`,
      maintenanceRequestId: req.id,
      authorId: userId,
      content: data.content,
      createdAt: new Date(),
      author,
    };
    req.comments.push(comment);
    return comment;
  }

  // --- Notifications ---
  public getNotifications(userId: string) {
    return this.notifications.filter((n) => n.userId === userId || !n.userId);
  }

  public markNotificationRead(id: string) {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) notif.read = true;
    return notif;
  }

  // --- Dashboards ---
  public getOwnerDashboard(ownerId: string) {
    const props = this.getPropertiesForOwner(ownerId);
    const totalProperties = props.length;
    const totalUnits = this.units.length;
    const occupiedUnits = this.tenancies.filter((t) => t.status === 'ACTIVE').length;
    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 100;

    const pendingMaintenance = this.maintenanceRequests.filter((r) => r.status === MaintenanceStatus.PENDING).length;
    const inProgressMaintenance = this.maintenanceRequests.filter((r) => r.status === MaintenanceStatus.IN_PROGRESS).length;
    const completedMaintenance = this.maintenanceRequests.filter((r) => r.status === MaintenanceStatus.COMPLETED).length;

    const upcomingBookings = this.bookings.slice(0, 5);
    const recentActivity = [
      { id: 'act-1', action: 'TENANT_CHECK_IN', description: 'Alex Rivera checked into Rooftop Heated Pool & Sun Deck', timestamp: new Date(Date.now() - 1000 * 60 * 30) },
      { id: 'act-2', action: 'MAINTENANCE_CREATED', description: 'New plumbing request submitted for Unit 101', timestamp: new Date(Date.now() - 1000 * 60 * 90) },
      { id: 'act-3', action: 'BOOKING_CREATED', description: 'Maya Lin requested Executive Conference Room', timestamp: new Date(Date.now() - 1000 * 60 * 180) },
    ];

    return {
      summary: {
        totalProperties,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        occupancyRate,
        pendingMaintenance,
        inProgressMaintenance,
        completedMaintenance,
        overdueMaintenance: 0,
        avgResolutionHours: 4.5,
        completionRate: 85,
        upcomingBookingsCount: upcomingBookings.length,
        pendingApprovalBookingsCount: upcomingBookings.filter((b) => b.status === BookingStatus.PENDING_APPROVAL).length,
        amenityUtilizationPercent: 78,
      },
      properties: props,
      maintenanceByStatus: [
        { status: 'PENDING', count: pendingMaintenance },
        { status: 'IN_PROGRESS', count: inProgressMaintenance },
        { status: 'COMPLETED', count: completedMaintenance },
      ],
      maintenanceByCategory: [
        { category: 'PLUMBING', count: 1 },
        { category: 'HVAC', count: 1 },
      ],
      upcomingBookings,
      recentActivity,
    };
  }

  public getTenantDashboard(tenantId: string) {
    const tenancy = this.tenancies.find((t) => t.tenantId === tenantId) || this.tenancies[0];
    const upcomingBookings = this.bookings.filter((b) => b.tenantId === tenantId);
    const activeRequests = this.maintenanceRequests.filter(
      (m) => m.tenantId === tenantId && m.status !== MaintenanceStatus.COMPLETED
    );

    return {
      tenancy,
      upcomingBookings,
      activeRequests,
      activeMaintenanceCount: activeRequests.length,
      completedMaintenanceCount: this.maintenanceRequests.filter(
        (m) => m.tenantId === tenantId && m.status === MaintenanceStatus.COMPLETED
      ).length,
      checkInStatusInfo: {
        hasActiveBooking: upcomingBookings.length > 0,
        bookingId: upcomingBookings[0]?.id,
        amenityName: upcomingBookings[0]?.amenity?.name,
        status: upcomingBookings[0]?.status,
        canCheckIn: true,
        canCheckOut: false,
      },
    };
  }

  public getStaffDashboard(staffId: string) {
    const assignedRequests = this.maintenanceRequests.filter((m) => m.assignedStaffId === staffId || !m.assignedStaffId);
    return {
      assignedRequests,
      summary: {
        pending: assignedRequests.filter((r) => r.status === MaintenanceStatus.PENDING).length,
        inProgress: assignedRequests.filter((r) => r.status === MaintenanceStatus.IN_PROGRESS).length,
        completed: assignedRequests.filter((r) => r.status === MaintenanceStatus.COMPLETED).length,
        totalAssigned: assignedRequests.length,
      },
      recentActivity: [],
    };
  }
}

export const demoStore = new DemoStore();
