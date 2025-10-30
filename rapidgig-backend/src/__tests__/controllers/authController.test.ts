import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRoutes from '../../routes/auth';
import pool from '../../config/database';
import { runMigrations } from '../../utils/migrations';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Controller', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  afterAll(async () => {
    await pool.query('DROP TABLE IF EXISTS password_reset_tokens CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM password_reset_tokens');
    await pool.query('DELETE FROM users');
  });

  describe('POST /api/auth/register', () => {
    it('should register a new student successfully', async () => {
      const userData = {
        email: 'student@test.com',
        password: 'password123',
        fullName: 'Test Student',
        role: 'student',
        skills: ['JavaScript', 'React'],
        university: 'Test University',
        graduationYear: 2024,
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user.full_name).toBe(userData.fullName);
      expect(response.body.data.user.role).toBe(userData.role);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should register a new recruiter successfully', async () => {
      const userData = {
        email: 'recruiter@test.com',
        password: 'password123',
        fullName: 'Test Recruiter',
        role: 'recruiter',
        companyName: 'Test Company',
        companyDescription: 'A test company',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.role).toBe(userData.role);
      expect(response.body.data.user.company_name).toBe(userData.companyName);
    });

    it('should return 400 for missing required fields', async () => {
      const userData = {
        email: 'incomplete@test.com',
        // Missing password, fullName, role
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('should return 400 for invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        fullName: 'Test User',
        role: 'student',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_EMAIL');
    });

    it('should return 400 for weak password', async () => {
      const userData = {
        email: 'weak@test.com',
        password: '123',
        fullName: 'Test User',
        role: 'student',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        email: 'duplicate@test.com',
        password: 'password123',
        fullName: 'Test User',
        role: 'student',
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('should return 400 for invalid role', async () => {
      const userData = {
        email: 'invalid@test.com',
        password: 'password123',
        fullName: 'Test User',
        role: 'invalid_role',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_ROLE');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user for login tests
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@test.com',
          password: 'password123',
          fullName: 'Login User',
          role: 'student',
        });
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: 'login@test.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(loginData.email);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.password).toBeUndefined();
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_CREDENTIALS');
    });

    it('should return 401 for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'password123',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: 'login@test.com',
        password: 'wrongpassword',
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'forgot@test.com',
          password: 'password123',
          fullName: 'Forgot User',
          role: 'student',
        });
    });

    it('should send reset link for valid email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'forgot@test.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');
    });

    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_EMAIL');
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create user and get reset token
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'reset@test.com',
          password: 'password123',
          fullName: 'Reset User',
          role: 'student',
        });

      userId = registerResponse.body.data.user.id;

      // Generate reset token
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'reset@test.com' });

      // Get the token from database (in real app, this would be from email)
      const tokenResult = await pool.query(
        'SELECT token FROM password_reset_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [userId]
      );
      resetToken = tokenResult.rows[0].token;
    });

    it('should reset password successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'newpassword123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset successfully');

      // Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'reset@test.com',
          password: 'newpassword123',
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
    });

    it('should return 400 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ newPassword: 'newpassword123' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: '123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('should return 400 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: 'invalid-token',
          newPassword: 'newpassword123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});