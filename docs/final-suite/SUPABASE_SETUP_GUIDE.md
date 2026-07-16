# Supabase Setup Guide

This guide covers setting up Supabase PostgreSQL for the final product migration.

## 1. Create a Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New Project** and choose an organization.
3. Set a strong database password and select a region close to your deployment (e.g., Vercel).
4. Wait for the database provisioning to complete.

## 2. Obtain Connection Strings
In the Supabase Dashboard, navigate to **Settings > Database**.
- Find the **Transaction pooled connection string** (usually ending in `?pgbouncer=true` or similar pooler config). Use this for `DATABASE_URL`.
- Find the **Direct connection string** (usually using port 5432 directly). Use this for `DIRECT_URL`.

## 3. Environment Configuration
Copy the connection strings into your local `.env.local` file (never commit this file):

```env
DATABASE_URL="postgres://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgres://postgres.xxx:password@db.xxx.supabase.co:5432/postgres"

# Temporary dual-write configuration
STORAGE_PROVIDER=dual
QUEUE_PROVIDER=outbox
```

> **WARNING:** Never expose these variables to the Expo mobile app via `EXPO_PUBLIC_` prefixes.

## 4. Prisma Migrations
- Use `npx prisma migrate dev` to generate local migration files.
- **Do not** apply unreviewed migrations remotely.
- **Do not** run `npx prisma migrate reset` against production Supabase.
- To deploy reviewed migrations to Supabase, use: `npx prisma migrate deploy`.

## 5. Next Steps
Once the database is set up and `STORAGE_PROVIDER=dual` is active, run the migration scripts to backfill data from KV to Supabase.
