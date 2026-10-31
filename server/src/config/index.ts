import dotenv from 'dotenv';
import path from 'path';
import os from 'os';

// Load .env from server directory or root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const defaultUploadDir = isServerless
  ? path.join(os.tmpdir(), 'uploads')
  : path.resolve(process.cwd(), 'uploads');

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/property_management?schema=public',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'super-secure-production-ready-jwt-secret-key-32-chars-min',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: process.env.COOKIE_NAME || 'prop_mgmt_token',
  cookieSecure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  storageDriver: (process.env.STORAGE_DRIVER || 'local') as 'local' | 's3',
  uploadDir: process.env.UPLOAD_DIR || defaultUploadDir,
};
