const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rapidgig_dev',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

async function createTestUser() {
  try {
    console.log('Creating test user...');
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Insert test user
    const query = `
      INSERT INTO users (email, password_hash, full_name, role, skills, university)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        skills = EXCLUDED.skills,
        university = EXCLUDED.university
      RETURNING id, email, full_name, role;
    `;
    
    const values = [
      'test@example.com',
      hashedPassword,
      'Test User',
      'student',
      ['JavaScript', 'React', 'Node.js'],
      'Test University'
    ];
    
    const result = await pool.query(query, values);
    console.log('✅ Test user created/updated:', result.rows[0]);
    
    // Also create a recruiter test user
    const recruiterQuery = `
      INSERT INTO users (email, password_hash, full_name, role, company_name, bio)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        company_name = EXCLUDED.company_name,
        bio = EXCLUDED.bio
      RETURNING id, email, full_name, role;
    `;
    
    const recruiterValues = [
      'recruiter@example.com',
      hashedPassword,
      'Test Recruiter',
      'recruiter',
      'Test Company',
      'A test company for recruiting'
    ];
    
    const recruiterResult = await pool.query(recruiterQuery, recruiterValues);
    console.log('✅ Test recruiter created/updated:', recruiterResult.rows[0]);
    
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    await pool.end();
  }
}

createTestUser();