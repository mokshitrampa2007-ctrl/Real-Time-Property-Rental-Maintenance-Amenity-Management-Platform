import { PrismaClient, Role, MaintenanceCategory, MaintenancePriority, MaintenanceStatus, BookingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Idempotent Development Database Seeding ---');

  // Clear existing demo data in reverse dependency order
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.amenityBooking.deleteMany({});
  await prisma.amenityClosure.deleteMany({});
  await prisma.amenityOperatingHours.deleteMany({});
  await prisma.amenity.deleteMany({});
  await prisma.maintenanceStatusHistory.deleteMany({});
  await prisma.maintenanceAttachment.deleteMany({});
  await prisma.maintenanceComment.deleteMany({});
  await prisma.maintenanceRequest.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.propertyStaff.deleteMany({});
  await prisma.tenancy.deleteMany({});
  await prisma.unit.deleteMany({});
  await prisma.property.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Cleaned existing records.');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Create Users
  const owner = await prisma.user.create({
    data: {
      name: 'Victoria Sterling',
      email: 'owner@example.com',
      passwordHash,
      role: Role.OWNER,
      phone: '+1 (555) 100-2000',
    },
  });

  const tenant1 = await prisma.user.create({
    data: {
      name: 'Alex Rivera',
      email: 'tenant1@example.com',
      passwordHash,
      role: Role.TENANT,
      phone: '+1 (555) 200-3001',
    },
  });

  const tenant2 = await prisma.user.create({
    data: {
      name: 'Maya Lin',
      email: 'tenant2@example.com',
      passwordHash,
      role: Role.TENANT,
      phone: '+1 (555) 200-3002',
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: 'Marcus Vance',
      email: 'staff@example.com',
      passwordHash,
      role: Role.STAFF,
      phone: '+1 (555) 300-4001',
    },
  });

  console.log('Created Users: Owner, 2 Tenants, 1 Staff.');

  // 2. Create 2 Properties
  const prop1 = await prisma.property.create({
    data: {
      ownerId: owner.id,
      name: 'Grand Horizon Luxury Residences',
      address: '742 Evergreen Terrace, Springfield, IL 62704',
      description: 'Premier residential community featuring world-class amenities and 24/7 on-site maintenance.',
      timeZone: 'America/Chicago',
    },
  });

  const prop2 = await prisma.property.create({
    data: {
      ownerId: owner.id,
      name: 'Pinecrest Urban Heights',
      address: '1204 Pinecrest Boulevard, Seattle, WA 98101',
      description: 'Modern eco-friendly apartments with rooftop garden and collaborative co-working lounges.',
      timeZone: 'America/Los_Angeles',
    },
  });

  console.log('Created 2 Properties.');

  // 3. Create Units for Property 1
  const u101 = await prisma.unit.create({
    data: { propertyId: prop1.id, unitNumber: '101', floor: 1, description: '1 Bed, 1 Bath Deluxe Garden View' },
  });
  const u102 = await prisma.unit.create({
    data: { propertyId: prop1.id, unitNumber: '102', floor: 1, description: '2 Bed, 2 Bath Courtyard View' },
  });
  const u201 = await prisma.unit.create({
    data: { propertyId: prop1.id, unitNumber: '201', floor: 2, description: '2 Bed, 2 Bath Balcony Penthouse' },
  });
  const u202 = await prisma.unit.create({
    data: { propertyId: prop1.id, unitNumber: '202', floor: 2, description: 'Studio Suite' },
  });

  // Units for Property 2
  await prisma.unit.create({
    data: { propertyId: prop2.id, unitNumber: '301', floor: 3, description: '1 Bed Eco Loft' },
  });
  await prisma.unit.create({
    data: { propertyId: prop2.id, unitNumber: '302', floor: 3, description: '2 Bed Corner Suite' },
  });

  // 4. Tenancies
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const oneYearLater = new Date(now.getTime() + 275 * 24 * 60 * 60 * 1000);

  await prisma.tenancy.create({
    data: {
      tenantId: tenant1.id,
      propertyId: prop1.id,
      unitId: u101.id,
      startDate: threeMonthsAgo,
      endDate: oneYearLater,
      status: 'ACTIVE',
    },
  });

  await prisma.tenancy.create({
    data: {
      tenantId: tenant2.id,
      propertyId: prop1.id,
      unitId: u102.id,
      startDate: threeMonthsAgo,
      endDate: oneYearLater,
      status: 'ACTIVE',
    },
  });

  // 5. Staff Membership
  await prisma.propertyStaff.create({
    data: {
      propertyId: prop1.id,
      staffId: staff.id,
      roleTitle: 'Senior Maintenance Lead',
    },
  });
  await prisma.propertyStaff.create({
    data: {
      propertyId: prop2.id,
      staffId: staff.id,
      roleTitle: 'HVAC & Plumbing Specialist',
    },
  });

  console.log('Assigned Tenancies & Property Staff.');

  // 6. Amenities with Operating Hours
  const defaultHours = [0, 1, 2, 3, 4, 5, 6].map(weekday => ({
    weekday,
    openingTime: '06:00',
    closingTime: '22:00',
  }));

  const gym = await prisma.amenity.create({
    data: {
      propertyId: prop1.id,
      name: 'High-Performance Fitness Center',
      description: 'Fully equipped gym with cardio deck, free weights, and Olympic lifting platforms.',
      location: 'Ground Floor, North Wing',
      capacity: 15,
      active: true,
      approvalRequired: false,
      slotDurationMinutes: 60,
      minimumBookingMinutes: 30,
      maximumBookingMinutes: 120,
      advanceBookingDays: 14,
      cancellationCutoffMinutes: 60,
      checkInGraceMinutes: 15,
      operatingHours: { create: defaultHours },
    },
  });

  const pool = await prisma.amenity.create({
    data: {
      propertyId: prop1.id,
      name: 'Skyview Infinity Pool & Cabanas',
      description: 'Heated outdoor infinity pool with panoramic city views and private sun cabanas.',
      location: '5th Floor Sun Terrace',
      capacity: 25,
      active: true,
      approvalRequired: false,
      slotDurationMinutes: 60,
      minimumBookingMinutes: 60,
      maximumBookingMinutes: 180,
      advanceBookingDays: 7,
      cancellationCutoffMinutes: 120,
      checkInGraceMinutes: 20,
      operatingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map(weekday => ({
          weekday,
          openingTime: '07:00',
          closingTime: '21:00',
        })),
      },
    },
  });

  const communityHall = await prisma.amenity.create({
    data: {
      propertyId: prop1.id,
      name: 'Clubhouse Banquet & Event Hall',
      description: 'Elegant event venue with catering kitchen, AV system, and lounge seating for private gatherings.',
      location: 'Main Pavilion, 2nd Floor',
      capacity: 50,
      active: true,
      approvalRequired: true, // Requires owner approval!
      slotDurationMinutes: 120,
      minimumBookingMinutes: 60,
      maximumBookingMinutes: 300,
      advanceBookingDays: 30,
      cancellationCutoffMinutes: 240,
      checkInGraceMinutes: 30,
      operatingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map(weekday => ({
          weekday,
          openingTime: '09:00',
          closingTime: '23:00',
        })),
      },
    },
  });

  const badmintonCourt = await prisma.amenity.create({
    data: {
      propertyId: prop1.id,
      name: 'Indoor Badminton & Squash Arena',
      description: 'Regulation-size hardwood indoor sports court with overhead LED stadium lighting.',
      location: 'Sports Complex Level B1',
      capacity: 4,
      active: true,
      approvalRequired: false,
      slotDurationMinutes: 60,
      minimumBookingMinutes: 60,
      maximumBookingMinutes: 120,
      advanceBookingDays: 7,
      cancellationCutoffMinutes: 60,
      checkInGraceMinutes: 15,
      operatingHours: {
        create: [0, 1, 2, 3, 4, 5, 6].map(weekday => ({
          weekday,
          openingTime: '08:00',
          closingTime: '22:00',
        })),
      },
    },
  });

  console.log('Created 4 Amenities with operating hours.');

  // 7. Maintenance Requests across states: PENDING, IN_PROGRESS, COMPLETED, and OVERDUE
  // A. Overdue request (> 48h ago)
  const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);
  const overdueReq = await prisma.maintenanceRequest.create({
    data: {
      tenantId: tenant1.id,
      propertyId: prop1.id,
      unitId: u101.id,
      title: 'Master Bathroom Shower Drain Clogged',
      description: 'Water drains very slowly during shower and builds up standing water. Tried plunger without success.',
      category: MaintenanceCategory.PLUMBING,
      priority: MaintenancePriority.HIGH,
      status: MaintenanceStatus.PENDING,
      createdAt: seventyTwoHoursAgo,
      statusHistory: {
        create: {
          previousStatus: MaintenanceStatus.PENDING,
          newStatus: MaintenanceStatus.PENDING,
          changedById: tenant1.id,
          notes: 'Initial request submitted by tenant',
          createdAt: seventyTwoHoursAgo,
        },
      },
      comments: {
        create: [
          { authorId: tenant1.id, message: 'Please attend to this as soon as possible.', createdAt: seventyTwoHoursAgo },
        ],
      },
    },
  });

  // B. In-Progress Request
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const inProgressReq = await prisma.maintenanceRequest.create({
    data: {
      tenantId: tenant2.id,
      propertyId: prop1.id,
      unitId: u102.id,
      assignedStaffId: staff.id,
      title: 'AC Thermostat Display Glitching',
      description: 'Digital thermostat resets intermittently and cooling does not maintain 72F.',
      category: MaintenanceCategory.HVAC,
      priority: MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.IN_PROGRESS,
      createdAt: twelveHoursAgo,
      statusHistory: {
        create: [
          {
            previousStatus: MaintenanceStatus.PENDING,
            newStatus: MaintenanceStatus.PENDING,
            changedById: tenant2.id,
            notes: 'Request submitted',
            createdAt: twelveHoursAgo,
          },
          {
            previousStatus: MaintenanceStatus.PENDING,
            newStatus: MaintenanceStatus.IN_PROGRESS,
            changedById: staff.id,
            notes: 'Staff Marcus Vance assigned and inspecting control board',
            createdAt: new Date(twelveHoursAgo.getTime() + 60 * 60 * 1000),
          },
        ],
      },
      comments: {
        create: [
          { authorId: staff.id, message: 'Ordered replacement control relay. Will install tomorrow morning.', createdAt: new Date(twelveHoursAgo.getTime() + 2 * 60 * 60 * 1000) },
          { authorId: tenant2.id, message: 'Thanks for the quick turnaround Marcus!', createdAt: new Date(twelveHoursAgo.getTime() + 3 * 60 * 60 * 1000) },
        ],
      },
    },
  });

  // C. Completed Request
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
  await prisma.maintenanceRequest.create({
    data: {
      tenantId: tenant1.id,
      propertyId: prop1.id,
      unitId: u101.id,
      assignedStaffId: staff.id,
      title: 'Kitchen Sink Faucet Aerator Replacement',
      description: 'Low water pressure on hot water side.',
      category: MaintenanceCategory.PLUMBING,
      priority: MaintenancePriority.LOW,
      status: MaintenanceStatus.COMPLETED,
      completedAt: fourDaysAgo,
      createdAt: fiveDaysAgo,
      statusHistory: {
        create: [
          { previousStatus: MaintenanceStatus.PENDING, newStatus: MaintenanceStatus.PENDING, changedById: tenant1.id, createdAt: fiveDaysAgo },
          { previousStatus: MaintenanceStatus.PENDING, newStatus: MaintenanceStatus.IN_PROGRESS, changedById: staff.id, createdAt: new Date(fiveDaysAgo.getTime() + 10 * 60 * 60 * 1000) },
          { previousStatus: MaintenanceStatus.IN_PROGRESS, newStatus: MaintenanceStatus.COMPLETED, changedById: staff.id, notes: 'Cleaned sediment and replaced aerator screen. Flow restored.', createdAt: fourDaysAgo },
        ],
      },
    },
  });

  console.log('Created Maintenance Requests across all states.');

  // 8. Amenity Bookings (Relative dates so the demo is interactive right away)
  // Tomorrow at 10:00 - 11:00 (CONFIRMED)
  const tomorrow10am = new Date(now);
  tomorrow10am.setDate(tomorrow10am.getDate() + 1);
  tomorrow10am.setHours(10, 0, 0, 0);

  const tomorrow11am = new Date(tomorrow10am);
  tomorrow11am.setHours(11, 0, 0, 0);

  await prisma.amenityBooking.create({
    data: {
      amenityId: gym.id,
      tenantId: tenant1.id,
      propertyId: prop1.id,
      startsAt: tomorrow10am,
      endsAt: tomorrow11am,
      attendeeCount: 1,
      status: BookingStatus.CONFIRMED,
    },
  });

  // Tomorrow at 11:00 - 12:00 (Adjacent booking by tenant2 on gym!)
  const tomorrow12pm = new Date(tomorrow10am);
  tomorrow12pm.setHours(12, 0, 0, 0);

  await prisma.amenityBooking.create({
    data: {
      amenityId: gym.id,
      tenantId: tenant2.id,
      propertyId: prop1.id,
      startsAt: tomorrow11am,
      endsAt: tomorrow12pm,
      attendeeCount: 2,
      status: BookingStatus.CONFIRMED,
    },
  });

  // Pending Approval Booking on Community Hall (2 days from now)
  const twoDaysLater = new Date(now);
  twoDaysLater.setDate(twoDaysLater.getDate() + 2);
  twoDaysLater.setHours(18, 0, 0, 0);

  const twoDaysLaterEnd = new Date(twoDaysLater);
  twoDaysLaterEnd.setHours(21, 0, 0, 0);

  await prisma.amenityBooking.create({
    data: {
      amenityId: communityHall.id,
      tenantId: tenant1.id,
      propertyId: prop1.id,
      startsAt: twoDaysLater,
      endsAt: twoDaysLaterEnd,
      attendeeCount: 20,
      status: BookingStatus.PENDING_APPROVAL,
    },
  });

  // Completed booking from yesterday
  const yesterday2pm = new Date(now);
  yesterday2pm.setDate(yesterday2pm.getDate() - 1);
  yesterday2pm.setHours(14, 0, 0, 0);

  const yesterday3pm = new Date(yesterday2pm);
  yesterday3pm.setHours(15, 0, 0, 0);

  await prisma.amenityBooking.create({
    data: {
      amenityId: badmintonCourt.id,
      tenantId: tenant2.id,
      propertyId: prop1.id,
      startsAt: yesterday2pm,
      endsAt: yesterday3pm,
      attendeeCount: 4,
      status: BookingStatus.COMPLETED,
      actualCheckInAt: new Date(yesterday2pm.getTime() + 3 * 60 * 1000),
      actualCheckOutAt: new Date(yesterday3pm.getTime() - 2 * 60 * 1000),
    },
  });

  // 9. Notifications
  await prisma.notification.create({
    data: {
      userId: owner.id,
      type: 'BOOKING_APPROVAL_REQUESTED',
      title: 'Booking Approval Required',
      message: `${tenant1.name} requested to reserve Clubhouse Banquet & Event Hall.`,
      entityType: 'BOOKING',
    },
  });

  await prisma.notification.create({
    data: {
      userId: tenant1.id,
      type: 'MAINTENANCE_STATUS_CHANGED',
      title: 'Maintenance Request Overdue Notice',
      message: 'Your request regarding shower drain is logged and prioritized.',
      entityType: 'MAINTENANCE',
      entityId: overdueReq.id,
    },
  });

  // 10. Audit Logs
  await prisma.auditLog.create({
    data: {
      actorId: owner.id,
      action: 'SYSTEM_INITIALIZED',
      entityType: 'System',
      entityId: prop1.id,
      propertyId: prop1.id,
      metadata: JSON.stringify({ message: 'Development database seeded successfully.' }),
    },
  });

  console.log('--- Database Seeding Completed Successfully! ---');
  console.log('\nDemo User Accounts:');
  console.log('1. OWNER:       owner@example.com   / Password123!');
  console.log('2. TENANT 1:    tenant1@example.com / Password123!');
  console.log('3. TENANT 2:    tenant2@example.com / Password123!');
  console.log('4. STAFF:       staff@example.com   / Password123!\n');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
