import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

const app = createApp();

let tenant1Cookie: string[];
let tenant2Cookie: string[];
let ownerCookie: string[];
let gymAmenityId: string;

describe('Concurrency-Safe Amenity Bookings & Database Exclusion Constraint', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });
  beforeAll(async () => {
    // Log in tenant1
    const t1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tenant1@example.com', password: 'Password123!' });
    tenant1Cookie = t1.headers['set-cookie'];

    // Log in tenant2
    const t2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'tenant2@example.com', password: 'Password123!' });
    tenant2Cookie = t2.headers['set-cookie'];

    // Log in owner
    const o = await request(app)
      .post('/api/auth/login')
      .send({ email: 'owner@example.com', password: 'Password123!' });
    ownerCookie = o.headers['set-cookie'];

    const gym = await prisma.amenity.findFirst({
      where: { name: { contains: 'Fitness Center' } },
    });
    gymAmenityId = gym!.id;

    // Clean up test bookings from future days so each test run starts fresh
    await prisma.amenityBooking.deleteMany({
      where: {
        amenityId: gymAmenityId,
        startsAt: { gte: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
      },
    });
  });

  it('should allow tenant to book an available time slot', async () => {
    // 5 days from now 14:00 - 15:00 UTC
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 5);
    targetDate.setUTCHours(14, 0, 0, 0);

    const endDate = new Date(targetDate);
    endDate.setUTCHours(15, 0, 0, 0);

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', tenant1Cookie)
      .send({
        amenityId: gymAmenityId,
        startsAt: targetDate.toISOString(),
        endsAt: endDate.toISOString(),
        attendeeCount: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.booking.status).toBe('CONFIRMED');
  });

  it('should REJECT an overlapping booking attempt with HTTP 409 Conflict', async () => {
    // Same day, overlapping interval: 14:30 - 15:30
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 5);
    targetDate.setUTCHours(14, 30, 0, 0);

    const endDate = new Date(targetDate);
    endDate.setUTCHours(15, 30, 0, 0);

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', tenant2Cookie)
      .send({
        amenityId: gymAmenityId,
        startsAt: targetDate.toISOString(),
        endsAt: endDate.toISOString(),
        attendeeCount: 1,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('BOOKING_CONFLICT');
  });

  it('should ACCEPT an adjacent booking interval without conflict [15:00, 16:00)', async () => {
    // Immediately adjacent interval: 15:00 - 16:00
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 5);
    targetDate.setUTCHours(15, 0, 0, 0);

    const endDate = new Date(targetDate);
    endDate.setUTCHours(16, 0, 0, 0);

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', tenant2Cookie)
      .send({
        amenityId: gymAmenityId,
        startsAt: targetDate.toISOString(),
        endsAt: endDate.toISOString(),
        attendeeCount: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.booking.status).toBe('CONFIRMED');
  });

  it('should atomically handle simultaneous concurrent booking attempts so exactly one succeeds', async () => {
    // 6 days from now 16:00 - 17:00
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 6);
    targetDate.setUTCHours(16, 0, 0, 0);

    const endDate = new Date(targetDate);
    endDate.setUTCHours(17, 0, 0, 0);

    // Fire two identical requests at the exact same millisecond concurrently!
    const [res1, res2] = await Promise.all([
      request(app)
        .post('/api/bookings')
        .set('Cookie', tenant1Cookie)
        .send({
          amenityId: gymAmenityId,
          startsAt: targetDate.toISOString(),
          endsAt: endDate.toISOString(),
          attendeeCount: 1,
        }),
      request(app)
        .post('/api/bookings')
        .set('Cookie', tenant2Cookie)
        .send({
          amenityId: gymAmenityId,
          startsAt: targetDate.toISOString(),
          endsAt: endDate.toISOString(),
          attendeeCount: 1,
        }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    // Exactly one 201 Created and exactly one 409 Conflict!
    expect(statuses).toEqual([201, 409]);

    const conflictRes = res1.status === 409 ? res1 : res2;
    expect(conflictRes.body.error.code).toBe('BOOKING_CONFLICT');
  });

  it('should immediately release the slot when a booking is cancelled', async () => {
    // 7 days from now 12:00 - 13:00
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    targetDate.setUTCHours(12, 0, 0, 0);

    const endDate = new Date(targetDate);
    endDate.setUTCHours(13, 0, 0, 0);

    // Tenant 1 books
    const bookRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', tenant1Cookie)
      .send({
        amenityId: gymAmenityId,
        startsAt: targetDate.toISOString(),
        endsAt: endDate.toISOString(),
        attendeeCount: 1,
      });

    expect(bookRes.status).toBe(201);
    const bookingId = bookRes.body.data.booking.id;

    // Tenant 1 cancels
    const cancelRes = await request(app)
      .post(`/api/bookings/${bookingId}/cancel`)
      .set('Cookie', tenant1Cookie);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.booking.status).toBe('CANCELLED');

    // Tenant 2 now books the exact same slot -> MUST SUCCEED because cancelled released the slot!
    const rebookRes = await request(app)
      .post('/api/bookings')
      .set('Cookie', tenant2Cookie)
      .send({
        amenityId: gymAmenityId,
        startsAt: targetDate.toISOString(),
        endsAt: endDate.toISOString(),
        attendeeCount: 1,
      });

    expect(rebookRes.status).toBe(201);
    expect(rebookRes.body.success).toBe(true);
  });

  it('should reject booking when attendee count exceeds amenity capacity', async () => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 8);
    targetDate.setUTCHours(10, 0, 0, 0);
    const endDate = new Date(targetDate);
    endDate.setUTCHours(11, 0, 0, 0);

    const res = await request(app)
      .post('/api/bookings')
      .set('Cookie', tenant1Cookie)
      .send({
        amenityId: gymAmenityId,
        startsAt: targetDate.toISOString(),
        endsAt: endDate.toISOString(),
        attendeeCount: 9999, // Way above capacity
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CAPACITY_EXCEEDED');
  });

  it('should return availability slots without exposing private tenant information', async () => {
    const res = await request(app)
      .get(`/api/bookings/availability?amenityId=${gymAmenityId}`)
      .set('Cookie', tenant1Cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.reservedSlots).toBeDefined();

    // Verify tenant names or emails are NOT exposed in public availability query
    for (const slot of res.body.data.reservedSlots) {
      expect(slot.tenant).toBeUndefined();
      expect(slot.tenantId).toBeUndefined();
      expect(slot.status).toBe('RESERVED');
    }
  });
});
