import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default(''),
  JWT_SECRET: z.string().default('development-secret-change-before-deploy'),
  ADMIN_USERNAME: z.string().trim().min(3).max(32).default(''),
  ADMIN_PASSWORD: z.string().default(''),
  ADMIN_NAME: z.string().trim().min(1).max(100).default('مدير المقهى'),
  APP_TIMEZONE: z.string().default('Asia/Damascus'),
  CLOUDINARY_CLOUD_NAME: z.string().trim().default(''),
  CLOUDINARY_API_KEY: z.string().trim().default(''),
  CLOUDINARY_API_SECRET: z.string().trim().default(''),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (parsed.data.NODE_ENV === 'production' && parsed.data.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must contain at least 32 characters in production');
  process.exit(1);
}

try {
  new Intl.DateTimeFormat('en', { timeZone: parsed.data.APP_TIMEZONE });
} catch {
  console.error('APP_TIMEZONE must be a valid IANA timezone');
  process.exit(1);
}

export const env = {
  nodeEnv: parsed.data.NODE_ENV,
  port: parsed.data.PORT,
  databaseUrl: parsed.data.DATABASE_URL,
  jwtSecret: parsed.data.JWT_SECRET,
  adminUsername: parsed.data.ADMIN_USERNAME,
  adminPassword: parsed.data.ADMIN_PASSWORD,
  adminName: parsed.data.ADMIN_NAME,
  appTimezone: parsed.data.APP_TIMEZONE,
  cloudinaryCloudName: parsed.data.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: parsed.data.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: parsed.data.CLOUDINARY_API_SECRET,
  corsOrigins: parsed.data.CORS_ORIGINS
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
