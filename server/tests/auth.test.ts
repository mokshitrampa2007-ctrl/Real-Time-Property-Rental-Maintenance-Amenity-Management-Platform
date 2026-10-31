import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

const app = createApp();

describe('Authentication & Authorization API', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });
  it('should successfully log in demo owner with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('OWNER');
    expect(res.body.data.token).toBeDefined();
    // Cookie should be set
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies[0]).toContain('prop_mgmt_token=');
  });

  it('should reject login with invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should return current user profile on /api/auth/me', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tenant1@example.com', password: 'Password123!' });

    const cookie = loginRes.headers['set-cookie'];

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe('tenant1@example.com');
    expect(meRes.body.data.user.role).toBe('TENANT');
  });

  it('should reject unauthenticated access to protected routes', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should prevent tenants from accessing owner property endpoints', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tenant1@example.com', password: 'Password123!' });

    const cookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/properties')
      .set('Cookie', cookie)
      .send({ name: 'Unauthorized Tower', address: '123 Fake St' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
