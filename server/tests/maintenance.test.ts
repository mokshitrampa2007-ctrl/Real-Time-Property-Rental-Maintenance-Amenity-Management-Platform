import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

const app = createApp();

let tenantCookie: string[];
let ownerCookie: string[];
let staffCookie: string[];
let propertyId: string;
let unitId: string;
let createdRequestId: string;

describe('Maintenance Workflow & Authorization', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeAll(async () => {
    // Log in tenant1
    const tLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tenant1@example.com', password: 'Password123!' });
    tenantCookie = tLogin.headers['set-cookie'];

    // Log in owner
    const oLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'Password123!' });
    ownerCookie = oLogin.headers['set-cookie'];

    // Log in staff
    const sLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'staff@example.com', password: 'Password123!' });
    staffCookie = sLogin.headers['set-cookie'];

    // Get tenant1 tenancy unit
    const tenantUser = await prisma.user.findUnique({
      where: { email: 'tenant1@example.com' },
      include: { tenancies: true },
    });
    propertyId = tenantUser!.tenancies[0].propertyId;
    unitId = tenantUser!.tenancies[0].unitId;
  });

  it('should allow tenant to create a maintenance request for their unit', async () => {
    const res = await request(app)
      .post('/api/maintenance')
      .set('Cookie', tenantCookie)
      .field('propertyId', propertyId)
      .field('unitId', unitId)
      .field('title', 'Kitchen Disposal Jammed')
      .field('description', 'Disposal humming but blade not spinning freely')
      .field('category', 'APPLIANCE')
      .field('priority', 'MEDIUM');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request.status).toBe('PENDING');
    expect(res.body.data.request.completedAt).toBeNull();
    createdRequestId = res.body.data.request.id;
  });

  it('should prevent tenant from accessing another tenant private request', async () => {
    // Log in tenant2
    const t2Login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tenant2@example.com', password: 'Password123!' });
    const tenant2Cookie = t2Login.headers['set-cookie'];

    const res = await request(app)
      .get(`/api/maintenance/${createdRequestId}`)
      .set('Cookie', tenant2Cookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should allow owner to assign staff to the maintenance request', async () => {
    const staffUser = await prisma.user.findUnique({ where: { email: 'staff@example.com' } });

    const res = await request(app)
      .patch(`/api/maintenance/${createdRequestId}/assign`)
      .set('Cookie', ownerCookie)
      .send({ staffId: staffUser!.id });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request.assignedStaff.id).toBe(staffUser!.id);
  });

  it('should allow assigned staff to update status to IN_PROGRESS', async () => {
    const res = await request(app)
      .patch(`/api/maintenance/${createdRequestId}/status`)
      .set('Cookie', staffCookie)
      .send({ status: 'IN_PROGRESS', notes: 'Inspected disposal and cleared coin jam' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request.status).toBe('IN_PROGRESS');
  });

  it('should reject invalid transition from IN_PROGRESS back to PENDING', async () => {
    const res = await request(app)
      .patch(`/api/maintenance/${createdRequestId}/status`)
      .set('Cookie', staffCookie)
      .send({ status: 'PENDING' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_TRANSITION');
  });

  it('should allow staff to complete the request and set completedAt', async () => {
    const res = await request(app)
      .patch(`/api/maintenance/${createdRequestId}/status`)
      .set('Cookie', staffCookie)
      .send({ status: 'COMPLETED', notes: 'Disposal tested, functional and leak-free' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.request.status).toBe('COMPLETED');
    expect(res.body.data.request.completedAt).not.toBeNull();
  });

  it('should make completed maintenance request read-only in Phase 1', async () => {
    const res = await request(app)
      .patch(`/api/maintenance/${createdRequestId}/status`)
      .set('Cookie', ownerCookie)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('READ_ONLY');
  });
});
