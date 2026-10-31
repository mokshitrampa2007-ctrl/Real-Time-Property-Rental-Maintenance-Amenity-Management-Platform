import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface StorageResult {
  storageKey: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface IStorageService {
  saveFile(file: Express.Multer.File): Promise<StorageResult>;
  getFilePath(storageKey: string): string;
  deleteFile(storageKey: string): Promise<void>;
}

export class LocalStorageService implements IStorageService {
  private uploadDir: string;

  constructor(uploadDir: string = config.uploadDir) {
    this.uploadDir = uploadDir;
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File): Promise<StorageResult> {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomHex = crypto.randomBytes(16).toString('hex');
    const storageKey = `${Date.now()}-${randomHex}${ext}`;
    const destination = path.join(this.uploadDir, storageKey);

    if (file.buffer) {
      await fs.promises.writeFile(destination, file.buffer);
    } else if (file.path) {
      await fs.promises.copyFile(file.path, destination);
      try {
        await fs.promises.unlink(file.path);
      } catch (err) {
        // ignore tmp removal error
      }
    } else {
      throw new Error('No file data provided');
    }

    return {
      storageKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  getFilePath(storageKey: string): string {
    // Sanitize storageKey to prevent path traversal
    const safeKey = path.basename(storageKey);
    return path.join(this.uploadDir, safeKey);
  }

  async deleteFile(storageKey: string): Promise<void> {
    const safeKey = path.basename(storageKey);
    const fullPath = path.join(this.uploadDir, safeKey);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }
}

/**
 * Production S3 Adapter Stub
 * Can be configured with AWS SDK v3 @aws-sdk/client-s3 for durable production uploads.
 */
export class S3StorageService implements IStorageService {
  constructor() {
    logger.info('Initializing S3StorageService for production environment');
  }

  async saveFile(file: Express.Multer.File): Promise<StorageResult> {
    const ext = path.extname(file.originalname).toLowerCase();
    const storageKey = `uploads/${Date.now()}-${crypto.randomBytes(16).toString('hex')}${ext}`;
    // In actual production deployment with AWS credentials, upload to S3 client.
    return {
      storageKey,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  getFilePath(storageKey: string): string {
    // S3 URL or presigned URL can be returned here
    return `https://${process.env.S3_BUCKET_NAME || 'bucket'}.s3.${process.env.S3_REGION || 'us-east-1'}.amazonaws.com/${storageKey}`;
  }

  async deleteFile(storageKey: string): Promise<void> {
    logger.info(`S3StorageService: delete object ${storageKey}`);
  }
}

export const storageService: IStorageService =
  config.storageDriver === 's3' ? new S3StorageService() : new LocalStorageService();
