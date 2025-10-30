import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export async function initializeDatabase() {
  // First, connect to the default 'postgres' database to create our app database
  const adminPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: 'postgres', // Connect to default postgres database
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    // Check if database exists
    const dbName = process.env.DB_NAME || 'rapidgig_dev';
    const checkDbQuery = 'SELECT 1 FROM pg_database WHERE datname = $1';
    const result = await adminPool.query(checkDbQuery, [dbName]);
    
    if (result.rows.length === 0) {
      // Database doesn't exist, create it
      console.log(`📊 Creating database: ${dbName}`);
      await adminPool.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database ${dbName} created successfully`);
    } else {
      console.log(`📊 Database ${dbName} already exists`);
    }
    
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to PostgreSQL server. Please ensure PostgreSQL is running on port', process.env.DB_PORT || '5433');
      throw new Error('PostgreSQL server is not running or not accessible');
    } else if (error.code === '28P01') {
      console.error('❌ Authentication failed. Please check your PostgreSQL username and password in .env file');
      throw new Error('Database authentication failed');
    } else {
      console.error('❌ Database initialization error:', error.message);
      throw error;
    }
  } finally {
    await adminPool.end();
  }
}