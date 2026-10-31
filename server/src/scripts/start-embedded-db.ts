import EmbeddedPostgres from 'embedded-postgres';
import path from 'path';
import fs from 'fs';
import { Client } from 'pg';

const dbDir = path.resolve(process.cwd(), '.embedded-postgres-data');

async function main() {
  console.log('--- Starting Embedded PostgreSQL ---');
  console.log('Database directory:', dbDir);

  const pg = new EmbeddedPostgres({
    databaseDir: dbDir,
    port: 5432,
    user: 'postgres',
    password: 'password',
    persistent: true,
  });

  if (!fs.existsSync(dbDir)) {
    console.log('Initializing PostgreSQL database cluster...');
    await pg.initialise();
  }

  console.log('Starting PostgreSQL server...');
  await pg.start();
  console.log('PostgreSQL is running on port 5432!');

  // Ensure 'property_management' database exists and enable btree_gist extension
  const rootClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'postgres',
  });

  try {
    await rootClient.connect();
    const dbCheck = await rootClient.query(
      "SELECT 1 FROM pg_database WHERE datname = 'property_management'"
    );
    if (dbCheck.rows.length === 0) {
      console.log("Creating 'property_management' database...");
      await rootClient.query('CREATE DATABASE property_management');
    }
  } catch (err) {
    console.warn('DB creation note:', err);
  } finally {
    await rootClient.end();
  }

  // Connect to property_management to enable btree_gist
  const appClient = new Client({
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'property_management',
  });

  try {
    await appClient.connect();
    console.log('Enabling btree_gist extension...');
    await appClient.query('CREATE EXTENSION IF NOT EXISTS btree_gist;');
    console.log('btree_gist extension enabled successfully!');
  } catch (err) {
    console.warn('btree_gist note:', err);
  } finally {
    await appClient.end();
  }

  console.log('Embedded PostgreSQL is fully ready and configured!');

  // Keep process alive if run standalone
  process.on('SIGINT', async () => {
    console.log('\nStopping PostgreSQL...');
    await pg.stop();
    console.log('PostgreSQL stopped.');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await pg.stop();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Failed to start Embedded PostgreSQL:', err);
  process.exit(1);
});
