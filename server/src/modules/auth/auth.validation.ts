import { z } from 'zod';

export const registerOwnerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

export const registerWithInviteSchema = z.object({
  token: z.string().min(10, 'Invalid invitation token'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address').toLowerCase().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterOwnerInput = z.infer<typeof registerOwnerSchema>;
export type RegisterWithInviteInput = z.infer<typeof registerWithInviteSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
