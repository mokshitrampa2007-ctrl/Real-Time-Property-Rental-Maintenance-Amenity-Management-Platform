import { z } from 'zod';
import { MaintenanceCategory, MaintenancePriority, MaintenanceStatus } from '@prisma/client';

export const createMaintenanceRequestSchema = z.object({
  propertyId: z.string().uuid().or(z.string().min(1)),
  unitId: z.string().uuid().or(z.string().min(1)),
  title: z.string().min(3, 'Title must be at least 3 characters').max(100),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  category: z.nativeEnum(MaintenanceCategory),
  priority: z.nativeEnum(MaintenancePriority).default(MaintenancePriority.MEDIUM),
});

export const updateMaintenanceStatusSchema = z.object({
  status: z.nativeEnum(MaintenanceStatus),
  notes: z.string().optional(),
});

export const assignStaffSchema = z.object({
  staffId: z.string().uuid().or(z.string().min(1)).nullable(),
});

export const createCommentSchema = z.object({
  message: z.string().min(1, 'Comment message cannot be empty').max(1000),
});
