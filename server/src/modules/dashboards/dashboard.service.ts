import { prisma } from '../../config/prisma.js';
import { MaintenanceStatus, BookingStatus } from '@prisma/client';
import { demoStore } from '../../storage/demoStore.js';

export class DashboardService {
  static async getOwnerDashboard(ownerId: string, propertyId?: string) {
    try {
    const propertyWhere: any = { ownerId };
    if (propertyId) {
      propertyWhere.id = propertyId;
    }

    const properties = await prisma.property.findMany({
      where: propertyWhere,
      select: { id: true, name: true, timeZone: true },
    });

    const propertyIds = properties.map(p => p.id);

    if (propertyIds.length === 0) {
      return {
        summary: {
          totalProperties: 0,
          totalUnits: 0,
          occupiedUnits: 0,
          vacantUnits: 0,
          occupancyRate: null,
          pendingMaintenance: 0,
          inProgressMaintenance: 0,
          completedMaintenance: 0,
          overdueMaintenance: 0,
          avgResolutionHours: null,
          completionRate: null,
          upcomingBookingsCount: 0,
          pendingApprovalBookingsCount: 0,
          amenityUtilizationPercent: null,
        },
        properties: [],
        maintenanceByStatus: [],
        maintenanceByCategory: [],
        upcomingBookings: [],
        recentActivity: [],
      };
    }

    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Units & Occupancy
    const totalUnits = await prisma.unit.count({
      where: { propertyId: { in: propertyIds } },
    });

    const occupiedUnits = await prisma.unit.count({
      where: {
        propertyId: { in: propertyIds },
        tenancies: { some: { status: 'ACTIVE' } },
      },
    });

    const vacantUnits = totalUnits - occupiedUnits;
    const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : null;

    // 2. Maintenance Requests
    const maintenanceCounts = await prisma.maintenanceRequest.groupBy({
      by: ['status'],
      where: { propertyId: { in: propertyIds } },
      _count: { id: true },
    });

    let pendingMaintenance = 0;
    let inProgressMaintenance = 0;
    let completedMaintenance = 0;

    for (const m of maintenanceCounts) {
      if (m.status === MaintenanceStatus.PENDING) pendingMaintenance = m._count.id;
      if (m.status === MaintenanceStatus.IN_PROGRESS) inProgressMaintenance = m._count.id;
      if (m.status === MaintenanceStatus.COMPLETED) completedMaintenance = m._count.id;
    }

    // Overdue maintenance (unresolved > 48h)
    const overdueMaintenance = await prisma.maintenanceRequest.count({
      where: {
        propertyId: { in: propertyIds },
        status: { in: [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS] },
        createdAt: { lt: fortyEightHoursAgo },
      },
    });

    // Average resolution time (completedAt - createdAt)
    const completedRequests = await prisma.maintenanceRequest.findMany({
      where: {
        propertyId: { in: propertyIds },
        status: MaintenanceStatus.COMPLETED,
        completedAt: { not: null },
      },
      select: { createdAt: true, completedAt: true },
    });

    let avgResolutionHours: number | null = null;
    if (completedRequests.length > 0) {
      const totalResolutionMs = completedRequests.reduce((sum, r) => {
        return sum + (r.completedAt!.getTime() - r.createdAt.getTime());
      }, 0);
      avgResolutionHours = Math.round((totalResolutionMs / completedRequests.length) / (1000 * 60 * 60) * 10) / 10;
    }

    // Request Completion Rate (completed / total in last 30 days)
    const totalRequestsLast30Days = await prisma.maintenanceRequest.count({
      where: {
        propertyId: { in: propertyIds },
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const completedLast30Days = await prisma.maintenanceRequest.count({
      where: {
        propertyId: { in: propertyIds },
        status: MaintenanceStatus.COMPLETED,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const completionRate = totalRequestsLast30Days > 0
      ? Math.round((completedLast30Days / totalRequestsLast30Days) * 100)
      : null;

    // Maintenance by category
    const maintenanceByCategory = await prisma.maintenanceRequest.groupBy({
      by: ['category'],
      where: { propertyId: { in: propertyIds } },
      _count: { id: true },
    });

    // 3. Bookings & Utilization
    const upcomingBookings = await prisma.amenityBooking.findMany({
      where: {
        propertyId: { in: propertyIds },
        startsAt: { gte: now },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_APPROVAL] },
      },
      include: {
        amenity: { select: { id: true, name: true } },
        tenant: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: 'asc' },
      take: 5,
    });

    const upcomingBookingsCount = await prisma.amenityBooking.count({
      where: {
        propertyId: { in: propertyIds },
        startsAt: { gte: now },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_APPROVAL] },
      },
    });

    const pendingApprovalBookingsCount = await prisma.amenityBooking.count({
      where: {
        propertyId: { in: propertyIds },
        status: BookingStatus.PENDING_APPROVAL,
      },
    });

    // Amenity Utilization (Reserved minutes / Operating minutes in last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const activeAmenities = await prisma.amenity.findMany({
      where: { propertyId: { in: propertyIds }, active: true },
      include: {
        operatingHours: true,
        closures: {
          where: { startsAt: { lte: now }, endsAt: { gte: sevenDaysAgo } },
        },
      },
    });

    let totalOperatingMinutes = 0;
    for (const am of activeAmenities) {
      for (const oh of am.operatingHours) {
        const [openH, openM] = oh.openingTime.split(':').map(Number);
        const [closeH, closeM] = oh.closingTime.split(':').map(Number);
        const dailyMinutes = (closeH * 60 + closeM) - (openH * 60 + openM);
        if (dailyMinutes > 0) totalOperatingMinutes += dailyMinutes;
      }
    }

    // Bookings in the last 7 days
    const recentBookings = await prisma.amenityBooking.findMany({
      where: {
        propertyId: { in: propertyIds },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.COMPLETED] },
        startsAt: { gte: sevenDaysAgo, lte: now },
      },
      select: { startsAt: true, endsAt: true },
    });

    let totalReservedMinutes = 0;
    for (const b of recentBookings) {
      totalReservedMinutes += Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / (1000 * 60));
    }

    const amenityUtilizationPercent = totalOperatingMinutes > 0
      ? Math.min(100, Math.round((totalReservedMinutes / totalOperatingMinutes) * 100))
      : null;

    // 4. Recent Activity (Audit Log)
    const recentActivity = await prisma.auditLog.findMany({
      where: { propertyId: { in: propertyIds } },
      include: { actor: { select: { id: true, name: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    return {
      summary: {
        totalProperties: properties.length,
        totalUnits,
        occupiedUnits,
        vacantUnits,
        occupancyRate,
        pendingMaintenance,
        inProgressMaintenance,
        completedMaintenance,
        overdueMaintenance,
        avgResolutionHours,
        completionRate,
        upcomingBookingsCount,
        pendingApprovalBookingsCount,
        amenityUtilizationPercent,
      },
      properties,
      maintenanceByStatus: [
        { name: 'Pending', count: pendingMaintenance },
        { name: 'In Progress', count: inProgressMaintenance },
        { name: 'Completed', count: completedMaintenance },
      ],
      maintenanceByCategory: maintenanceByCategory.map(m => ({
        category: m.category,
        count: m._count.id,
      })),
      upcomingBookings,
      recentActivity,
    };
    } catch {
      return demoStore.getOwnerDashboard(ownerId);
    }
  }

  static async getTenantDashboard(tenantId: string) {
    try {
    const now = new Date();

    const activeMaintenance = await prisma.maintenanceRequest.findMany({
      where: {
        tenantId,
        status: { in: [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS] },
      },
      include: {
        unit: { select: { unitNumber: true } },
        assignedStaff: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const activeMaintenanceCount = await prisma.maintenanceRequest.count({
      where: {
        tenantId,
        status: { in: [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS] },
      },
    });

    const completedMaintenanceCount = await prisma.maintenanceRequest.count({
      where: {
        tenantId,
        status: MaintenanceStatus.COMPLETED,
      },
    });

    const upcomingBookings = await prisma.amenityBooking.findMany({
      where: {
        tenantId,
        startsAt: { gte: now },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING_APPROVAL] },
      },
      include: {
        amenity: { select: { id: true, name: true, location: true, checkInGraceMinutes: true } },
      },
      orderBy: { startsAt: 'asc' },
      take: 4,
    });

    // Check if there is an active check-in window right now
    const currentActiveBooking = await prisma.amenityBooking.findFirst({
      where: {
        tenantId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        endsAt: { gte: now },
      },
      include: {
        amenity: { select: { id: true, name: true, checkInGraceMinutes: true } },
      },
      orderBy: { startsAt: 'asc' },
    });

    let checkInStatusInfo: {
      hasActiveBooking: boolean;
      bookingId?: string;
      amenityName?: string;
      status?: string;
      canCheckIn?: boolean;
      canCheckOut?: boolean;
      startsAt?: Date;
      endsAt?: Date;
    } = { hasActiveBooking: false };

    if (currentActiveBooking) {
      const graceMs = (currentActiveBooking.amenity.checkInGraceMinutes || 15) * 60 * 1000;
      const canCheckIn =
        currentActiveBooking.status === BookingStatus.CONFIRMED &&
        now >= new Date(currentActiveBooking.startsAt.getTime() - graceMs) &&
        now <= new Date(currentActiveBooking.startsAt.getTime() + graceMs);

      const canCheckOut = currentActiveBooking.status === BookingStatus.CHECKED_IN;

      checkInStatusInfo = {
        hasActiveBooking: true,
        bookingId: currentActiveBooking.id,
        amenityName: currentActiveBooking.amenity.name,
        status: currentActiveBooking.status,
        canCheckIn,
        canCheckOut,
        startsAt: currentActiveBooking.startsAt,
        endsAt: currentActiveBooking.endsAt,
      };
    }

    const recentNotifications = await prisma.notification.findMany({
      where: { userId: tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const activeTenancy = await prisma.tenancy.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        property: { select: { id: true, name: true, address: true, timeZone: true } },
        unit: { select: { id: true, unitNumber: true, floor: true } },
      },
    });

    return {
      activeTenancy,
      activeMaintenance,
      activeMaintenanceCount,
      completedMaintenanceCount,
      upcomingBookings,
      checkInStatusInfo,
      recentNotifications,
    };
    } catch {
      return demoStore.getTenantDashboard(tenantId);
    }
  }

  static async getStaffDashboard(staffId: string) {
    try {
    const now = new Date();
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const assignedPending = await prisma.maintenanceRequest.count({
      where: { assignedStaffId: staffId, status: MaintenanceStatus.PENDING },
    });

    const assignedInProgress = await prisma.maintenanceRequest.count({
      where: { assignedStaffId: staffId, status: MaintenanceStatus.IN_PROGRESS },
    });

    const assignedCompleted = await prisma.maintenanceRequest.count({
      where: { assignedStaffId: staffId, status: MaintenanceStatus.COMPLETED },
    });

    const assignedOverdue = await prisma.maintenanceRequest.count({
      where: {
        assignedStaffId: staffId,
        status: { in: [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS] },
        createdAt: { lt: fortyEightHoursAgo },
      },
    });

    const activeTasks = await prisma.maintenanceRequest.findMany({
      where: {
        assignedStaffId: staffId,
        status: { in: [MaintenanceStatus.PENDING, MaintenanceStatus.IN_PROGRESS] },
      },
      include: {
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true } },
        tenant: { select: { name: true, phone: true } },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return {
      summary: {
        assignedPending,
        assignedInProgress,
        assignedCompleted,
        assignedOverdue,
      },
      activeTasks: activeTasks.map(t => ({
        ...t,
        isOverdue: now.getTime() - t.createdAt.getTime() > 48 * 60 * 60 * 1000,
      })),
    };
    } catch {
      return demoStore.getStaffDashboard(staffId);
    }
  }
}
