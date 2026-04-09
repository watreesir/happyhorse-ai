// this file is used to export the schema for the database
// Current project uses PostgreSQL in production and auth/runtime imports this entry.
// Keeping this aligned with DATABASE_PROVIDER avoids adapter/schema mismatch.
export * from './schema.postgres';
