const { Client } = require('pg');
require('dotenv').config();

async function initializeDatabase() {
  // First connect to postgres database to create our database
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: 'postgres', // Connect to default postgres database
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
  });

  try {
    await adminClient.connect();
    console.log('Connected to PostgreSQL server');

    // Check if database exists
    const dbCheckResult = await adminClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [process.env.DB_NAME || 'rapidgig_dev']
    );

    if (dbCheckResult.rows.length === 0) {
      // Create database
      await adminClient.query(`CREATE DATABASE ${process.env.DB_NAME || 'rapidgig_dev'}`);
      console.log(`✅ Database '${process.env.DB_NAME || 'rapidgig_dev'}' created successfully`);
    } else {
      console.log(`✅ Database '${process.env.DB_NAME || 'rapidgig_dev'}' already exists`);
    }

    await adminClient.end();

    // Now connect to our database and create tables
    const appClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433'),
      database: process.env.DB_NAME || 'rapidgig_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    });

    await appClient.connect();
    console.log(`Connected to ${process.env.DB_NAME || 'rapidgig_dev'} database`);

    // Create basic tables
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'recruiter')),
        profile_picture TEXT,
        bio TEXT,
        skills TEXT[],
        university VARCHAR(255),
        graduation_year INTEGER,
        company_name VARCHAR(255),
        company_logo TEXT,
        location VARCHAR(255),
        phone VARCHAR(20),
        linkedin_url TEXT,
        github_url TEXT,
        portfolio_url TEXT,
        google_id VARCHAR(255) UNIQUE,
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Users table created');

    await appClient.end();
    console.log('✅ Database initialization completed');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

initializeDatabase();