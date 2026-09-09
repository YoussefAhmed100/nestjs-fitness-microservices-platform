import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './apps/auth/src/database/schema.ts',
  out: './apps/auth/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_AUTH as string,
  },

  verbose: true,

  strict: true,
});