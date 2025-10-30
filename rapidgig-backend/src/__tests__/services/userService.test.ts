import { UserService } from '../../services/userService';
import pool from '../../config/database';
import { runMigrations } from '../../utils/migrations';

describe('UserService', () => {
  beforeAll(async () => {
    // Run migrations for test database
    await runMigrations();
  });

  afterAll(async () => {
    // Clean up test database
    await pool.query('DROP TABLE IF EXISTS password_reset_tokens CASCADE');
    await pool.query('DROP TABLE IF EXISTS users CASCADE');
    await pool.end();
  });

  beforeEach(async () => {
    // Clean up data before each test
    await pool.query('DELETE FROM password_reset_tokens');
    await pool.query('DELETE FROM users');
  });

  describe('createUser', () => {
    it('should create a new student user successfully', async () => {
      const userData = {
        email: 'student@test.com',
        password: 'password123',
        full_name: 'Test Student',
        role: 'student' as const,
        skills: ['JavaScript', 'React'],
        university: 'Test University',
        graduation_year: 2024,
      };

      const user = await UserService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.full_name).toBe(userData.full_name);
      expect(user.role).toBe(userData.role);
      expect(user.skills).toEqual(userData.skills);
      expect(user.university).toBe(userData.university);
      expect(user.graduation_year).toBe(userData.graduation_year);
      expect(user.id).toBeDefined();
      expect(user.created_at).toBeDefined();
      expect(user.updated_at).toBeDefined();
      // Password should not be returned
      expect((user as any).password).toBeUndefined();
    });

    it('should create a new recruiter user successfully', async () => {
      const userData = {
        email: 'recruiter@test.com',
        password: 'password123',
        full_name: 'Test Recruiter',
        role: 'recruiter' as const,
        company_name: 'Test Company',
        company_description: 'A test company',
      };

      const user = await UserService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.full_name).toBe(userData.full_name);
      expect(user.role).toBe(userData.role);
      expect(user.company_name).toBe(userData.company_name);
      expect(user.company_description).toBe(userData.company_description);
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'duplicate@test.com',
        password: 'password123',
        full_name: 'Test User',
        role: 'student' as const,
      };

      await UserService.createUser(userData);

      await expect(UserService.createUser(userData)).rejects.toThrow('Email already exists');
    });

    it('should hash the password', async () => {
      const userData = {
        email: 'password@test.com',
        password: 'password123',
        full_name: 'Test User',
        role: 'student' as const,
      };

      await UserService.createUser(userData);

      // Check that password is hashed in database
      const result = await pool.query('SELECT password FROM users WHERE email = $1', [userData.email]);
      const hashedPassword = result.rows[0].password;
      
      expect(hashedPassword).not.toBe(userData.password);
      expect(hashedPassword.length).toBeGreaterThan(50); // bcrypt hashes are long
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const userData = {
        email: 'find@test.com',
        password: 'password123',
        full_name: 'Find User',
        role: 'student' as const,
      };

      await UserService.createUser(userData);
      const foundUser = await UserService.findUserByEmail(userData.email);

      expect(foundUser).toBeDefined();
      expect(foundUser!.email).toBe(userData.email);
      expect(foundUser!.full_name).toBe(userData.full_name);
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await UserService.findUserByEmail('nonexistent@test.com');
      expect(foundUser).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should find user by id', async () => {
      const userData = {
        email: 'findbyid@test.com',
        password: 'password123',
        full_name: 'Find By ID User',
        role: 'student' as const,
      };

      const createdUser = await UserService.createUser(userData);
      const foundUser = await UserService.findUserById(createdUser.id);

      expect(foundUser).toBeDefined();
      expect(foundUser!.id).toBe(createdUser.id);
      expect(foundUser!.email).toBe(userData.email);
      // Password should not be returned
      expect((foundUser as any).password).toBeUndefined();
    });

    it('should return null for non-existent id', async () => {
      const foundUser = await UserService.findUserById('00000000-0000-0000-0000-000000000000');
      expect(foundUser).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const userData = {
        email: 'verify@test.com',
        password: 'password123',
        full_name: 'Verify User',
        role: 'student' as const,
      };

      await UserService.createUser(userData);
      const user = await UserService.findUserByEmail(userData.email);
      
      const isValid = await UserService.verifyPassword(userData.password, user!.password);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const userData = {
        email: 'verify2@test.com',
        password: 'password123',
        full_name: 'Verify User 2',
        role: 'student' as const,
      };

      await UserService.createUser(userData);
      const user = await UserService.findUserByEmail(userData.email);
      
      const isValid = await UserService.verifyPassword('wrongpassword', user!.password);
      expect(isValid).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const userData = {
        email: 'update@test.com',
        password: 'password123',
        full_name: 'Update User',
        role: 'student' as const,
      };

      const createdUser = await UserService.createUser(userData);
      
      const updateData = {
        full_name: 'Updated Name',
        skills: ['Python', 'Django'],
      };

      const updatedUser = await UserService.updateUser(createdUser.id, updateData);

      expect(updatedUser).toBeDefined();
      expect(updatedUser!.full_name).toBe(updateData.full_name);
      expect(updatedUser!.skills).toEqual(updateData.skills);
      expect(updatedUser!.email).toBe(userData.email); // Should remain unchanged
    });

    it('should return null for non-existent user', async () => {
      const updateData = { full_name: 'New Name' };
      const updatedUser = await UserService.updateUser('00000000-0000-0000-0000-000000000000', updateData);
      expect(updatedUser).toBeNull();
    });
  });

  describe('password reset functionality', () => {
    it('should create password reset token', async () => {
      const userData = {
        email: 'reset@test.com',
        password: 'password123',
        full_name: 'Reset User',
        role: 'student' as const,
      };

      const user = await UserService.createUser(userData);
      const token = await UserService.createPasswordResetToken(user.id);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(10);
    });

    it('should validate password reset token', async () => {
      const userData = {
        email: 'validate@test.com',
        password: 'password123',
        full_name: 'Validate User',
        role: 'student' as const,
      };

      const user = await UserService.createUser(userData);
      const token = await UserService.createPasswordResetToken(user.id);
      
      const userId = await UserService.validatePasswordResetToken(token);
      expect(userId).toBe(user.id);
    });

    it('should return null for invalid token', async () => {
      const userId = await UserService.validatePasswordResetToken('invalid-token');
      expect(userId).toBeNull();
    });

    it('should update password successfully', async () => {
      const userData = {
        email: 'updatepw@test.com',
        password: 'password123',
        full_name: 'Update Password User',
        role: 'student' as const,
      };

      const user = await UserService.createUser(userData);
      const newPassword = 'newpassword456';
      
      await UserService.updatePassword(user.id, newPassword);
      
      // Verify new password works
      const updatedUser = await UserService.findUserByEmail(userData.email);
      const isValid = await UserService.verifyPassword(newPassword, updatedUser!.password);
      expect(isValid).toBe(true);
      
      // Verify old password doesn't work
      const isOldValid = await UserService.verifyPassword(userData.password, updatedUser!.password);
      expect(isOldValid).toBe(false);
    });
  });
});