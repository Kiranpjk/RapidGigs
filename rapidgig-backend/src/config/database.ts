import dotenv from 'dotenv';

dotenv.config();

// Export a single pool instance. For tests we create an in-memory pg using pg-mem.
let pool: any;

if (process.env.NODE_ENV === 'test') {
  // Lazy require to avoid adding pg-mem to production bundle
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { newDb } = require('pg-mem');
  const emulated = newDb();
  // Create a pg-compatible Pool implementation from pg-mem
  const adapters = emulated.adapters.createPg();
  const Pool = adapters.Pool || adapters.Client || adapters;
  // If adapters provide Pool constructor, use it; otherwise use Client-like API
  pool = new Pool();
} else {
  const { Pool } = require('pg');

  pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'rapidgig_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

export default pool;