import { prisma } from '../../config/prisma.js';
import { Role } from '@prisma/client';
import { createAuditLog } from '../../utils/audit.js';

export interface CreatePropertyInput {
  name: string;
  address: string;
  description?: string;
  timeZone?: string;
}

export interface CreateUnitInput {
  propertyId: string;
  unitNumber: string;
  floor?: number;
  description?: string;
}

export interface AssignTenancyInput {
  propertyId: string;
  unitId: string;
  tenantEmail: string;
  startDate: Date;
  endDate?: Date;
}

export class PropertyService {
  static async createProperty(ownerId: string, input: CreatePropertyInput) {
    const property = await prisma.property.create({
      data: {
        ownerId,
        name: input.name,
        address: input.address,
        description: input.description,
        timeZone: input.timeZone || 'UTC',
      },
    });

    await createAuditLog({
      actorId: ownerId,
      action: 'PROPERTY_CREATED',
      entityType: 'Property',
      entityId: property.id,
      propertyId: property.id,
    });

    return property;
  }

  static async getOwnerProperties(ownerId: string) {
    return prisma.property.findMany({
      where: { ownerId },
      include: {
        _count: {
          select: {
            units: true,
            amenities: true,
            maintenanceRequests: true,
            staffMembers: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getPropertyDetails(propertyId: string, userId: string, role: Role) {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        units: {
          include: {
            tenancies: {
              where: { status: 'ACTIVE' },
              include: { tenant: { select: { id: true, name: true, email: true, phone: true } } },
            },
          },
          orderBy: { unitNumber: 'asc' },
        },
        staffMembers: {
          include: { staff: { select: { id: true, name: true, email: true, phone: true } } },
        },
        amenities: {
          where: { active: true },
          include: { operatingHours: true },
        },
      },
    });

    if (!property) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Property not found' };
    }

    // Role-based access check
    if (role === Role.OWNER && property.ownerId !== userId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not own this property' };
    }

    if (role === Role.TENANT) {
      const activeTenancy = await prisma.tenancy.findFirst({
        where: { propertyId, tenantId: userId, status: 'ACTIVE' },
      });
      if (!activeTenancy) {
        throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not have an active tenancy at this property' };
      }
    }

    if (role === Role.STAFF) {
      const isStaff = await prisma.propertyStaff.findFirst({
        where: { propertyId, staffId: userId },
      });
      if (!isStaff) {
        throw { statusCode: 403, code: 'FORBIDDEN', message: 'You are not assigned to this property' };
      }
    }

    return property;
  }

  static async createUnit(ownerId: string, input: CreateUnitInput) {
    const property = await prisma.property.findFirst({
      where: { id: input.propertyId, ownerId },
    });

    if (!property) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not own this property' };
    }

    const existingUnit = await prisma.unit.findUnique({
      where: {
        propertyId_unitNumber: {
          propertyId: input.propertyId,
          unitNumber: input.unitNumber.trim(),
        },
      },
    });

    if (existingUnit) {
      throw {
        statusCode: 409,
        code: 'DUPLICATE_UNIT',
        message: `Unit number "${input.unitNumber}" already exists in this property.`,
      };
    }

    return prisma.unit.create({
      data: {
        propertyId: input.propertyId,
        unitNumber: input.unitNumber.trim(),
        floor: input.floor || 1,
        description: input.description,
      },
    });
  }

  static async assignTenancy(ownerId: string, input: AssignTenancyInput) {
    const property = await prisma.property.findFirst({
      where: { id: input.propertyId, ownerId },
    });

    if (!property) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not own this property' };
    }

    // Check unit belongs to property
    const unit = await prisma.unit.findFirst({
      where: { id: input.unitId, propertyId: input.propertyId },
    });

    if (!unit) {
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Unit not found in this property' };
    }

    // Prevent overlapping active assignments for an exclusively occupied unit
    const existingActiveTenancy = await prisma.tenancy.findFirst({
      where: { unitId: input.unitId, status: 'ACTIVE' },
    });

    if (existingActiveTenancy) {
      throw {
        statusCode: 409,
        code: 'UNIT_OCCUPIED',
        message: `Unit ${unit.unitNumber} already has an active tenancy. Please end the current tenancy before assigning a new tenant.`,
      };
    }

    // Find tenant by email
    const tenant = await prisma.user.findUnique({
      where: { email: input.tenantEmail.toLowerCase().trim() },
    });

    if (!tenant) {
      throw { statusCode: 404, code: 'TENANT_NOT_FOUND', message: 'No registered user found with that email address.' };
    }

    if (tenant.role !== Role.TENANT) {
      throw { statusCode: 400, code: 'INVALID_ROLE', message: 'The user account is not registered as a TENANT.' };
    }

    const tenancy = await prisma.tenancy.create({
      data: {
        propertyId: input.propertyId,
        unitId: input.unitId,
        tenantId: tenant.id,
        startDate: input.startDate,
        endDate: input.endDate,
        status: 'ACTIVE',
      },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        unit: { select: { id: true, unitNumber: true } },
      },
    });

    await createAuditLog({
      actorId: ownerId,
      action: 'TENANCY_ASSIGNED',
      entityType: 'Tenancy',
      entityId: tenancy.id,
      propertyId: input.propertyId,
      metadata: { tenantId: tenant.id, unitId: input.unitId },
    });

    return tenancy;
  }

  static async endTenancy(ownerId: string, tenancyId: string) {
    const tenancy = await prisma.tenancy.findUnique({
      where: { id: tenancyId },
      include: { property: true },
    });

    if (!tenancy || tenancy.property.ownerId !== ownerId) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'Unauthorized to modify this tenancy' };
    }

    return prisma.tenancy.update({
      where: { id: tenancyId },
      data: { status: 'ENDED', endDate: new Date() },
    });
  }

  static async addStaffMember(ownerId: string, propertyId: string, staffEmail: string, roleTitle?: string) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, ownerId },
    });

    if (!property) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not own this property' };
    }

    const staffUser = await prisma.user.findUnique({
      where: { email: staffEmail.toLowerCase().trim() },
    });

    if (!staffUser) {
      throw { statusCode: 404, code: 'STAFF_NOT_FOUND', message: 'No user account found with that email.' };
    }

    if (staffUser.role !== Role.STAFF) {
      throw { statusCode: 400, code: 'INVALID_ROLE', message: 'User is not registered with role STAFF.' };
    }

    const existing = await prisma.propertyStaff.findUnique({
      where: { propertyId_staffId: { propertyId, staffId: staffUser.id } },
    });

    if (existing) {
      throw { statusCode: 409, code: 'ALREADY_STAFF', message: 'This staff member is already assigned to this property.' };
    }

    return prisma.propertyStaff.create({
      data: {
        propertyId,
        staffId: staffUser.id,
        roleTitle: roleTitle || 'Maintenance Staff',
      },
      include: { staff: { select: { id: true, name: true, email: true, phone: true } } },
    });
  }

  static async removeStaffMember(ownerId: string, propertyId: string, staffId: string) {
    const property = await prisma.property.findFirst({
      where: { id: propertyId, ownerId },
    });

    if (!property) {
      throw { statusCode: 403, code: 'FORBIDDEN', message: 'You do not own this property' };
    }

    return prisma.propertyStaff.deleteMany({
      where: { propertyId, staffId },
    });
  }

  static async getTenantPropertyInfo(tenantId: string) {
    const tenancy = await prisma.tenancy.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        property: {
          include: {
            owner: { select: { id: true, name: true, email: true, phone: true } },
            amenities: { where: { active: true }, include: { operatingHours: true } },
            staffMembers: { include: { staff: { select: { id: true, name: true, email: true } } } },
          },
        },
        unit: true,
      },
    });

    return tenancy;
  }
}
