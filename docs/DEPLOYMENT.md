# Production Deployment & Hosting Guide

## 1. Hosting Architecture Overview

EstateSync requires:
1. **Persistent Node.js Runtime**: For the Express server, background cleanup jobs, and stateful WebSockets (Socket.IO).
2. **PostgreSQL Database (v14+)**: With the `btree_gist` extension enabled for exclusion constraint support.
3. **Object Storage (Optional for Production)**: AWS S3 or Cloudflare R2 for durable photo attachments.
4. **Static CDN / Web Host**: For the Vite SPA frontend, or served directly from the Express server via `express.static`.

---

## 2. Docker Compose Deployment (Self-Hosted / Local)

A production-ready `docker-compose.yml` is included in the project root:

```bash
# 1. Start PostgreSQL with persistent storage
docker compose up -d

# 2. Run migrations, apply exclusion constraints, and seed
npm run db:constraint
npm run db:seed

# 3. Build and launch application
npm run build
npm start
```

---

## 3. Cloud Deployment (Render / Railway / Fly.io)

### 3.1 Managed Database Setup (Supabase / Neon / AWS RDS)
1. Provision a PostgreSQL instance.
2. Ensure the `btree_gist` extension can be installed:
   ```sql
   CREATE EXTENSION IF NOT EXISTS btree_gist;
   ```
3. Set the `DATABASE_URL` environment variable.

### 3.2 Backend Service (Web Service)
Deploy as a persistent Node.js service (e.g. on Railway or Render):
- **Build Command**:
  ```bash
  npm install && npm run build
  ```
- **Start Command**:
  ```bash
  npm start
  ```
- **Required Environment Variables**:
  ```env
  NODE_ENV=production
  PORT=4000
  DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
  CLIENT_ORIGIN=https://your-frontend-domain.com
  JWT_SECRET=generate-a-strong-random-64-character-string
  JWT_EXPIRES_IN=7d
  COOKIE_NAME=prop_mgmt_token
  COOKIE_SECURE=true
  STORAGE_DRIVER=s3
  S3_BUCKET_NAME=my-estate-sync-bucket
  S3_REGION=us-east-1
  AWS_ACCESS_KEY_ID=AKIA...
  AWS_SECRET_ACCESS_KEY=...
  ```

---

## 4. Production Security Checklist

- [x] Set `NODE_ENV=production` to ensure stack traces are hidden from error responses.
- [x] Enable `COOKIE_SECURE=true` so cookies require HTTPS.
- [x] Configure `CLIENT_ORIGIN` to match your production frontend URL.
- [x] Use a cryptographically secure `JWT_SECRET` (minimum 32 characters).
- [x] Set up AWS S3 with restricted bucket policies rather than local disk storage.
