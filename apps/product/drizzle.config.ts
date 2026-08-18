import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();


export default defineConfig({
  schema: './apps/product/src/database/*.schema.ts',
  out: './apps/product/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_PRODUCT!,
  },
  verbose: true,
  strict: true,
});