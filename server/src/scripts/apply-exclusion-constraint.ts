import { Client } from 'pg';
import { config } from '../config/index.js';

export async function applyExclusionConstraint() {
  const client = new Client({ connectionString: config.databaseUrl });
  await client.connect();

  try {
    console.log('Ensuring btree_gist extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS btree_gist;');

    console.log('Checking for existing constraint...');
    await client.query('ALTER TABLE "AmenityBooking" DROP CONSTRAINT IF EXISTS "no_overlapping_bookings";');

    console.log('Applying exclusion constraint "no_overlapping_bookings" on AmenityBooking...');
    await client.query(`
      ALTER TABLE "AmenityBooking"
      ADD CONSTRAINT "no_overlapping_bookings"
      EXCLUDE USING gist (
        "amenityId" WITH =,
        tsrange("startsAt"::timestamp, "endsAt"::timestamp) WITH &&
      )
      WHERE ("status" = 'PENDING_APPROVAL' OR "status" = 'CONFIRMED' OR "status" = 'CHECKED_IN');
    `);

    console.log('PostgreSQL exclusion constraint "no_overlapping_bookings" successfully applied!');
  } catch (err) {
    console.error('Error applying exclusion constraint:', err);
    throw err;
  } finally {
    await client.end();
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('apply-exclusion-constraint.ts')) {
  applyExclusionConstraint()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
