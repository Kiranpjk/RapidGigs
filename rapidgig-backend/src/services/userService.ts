import pool from '../config/database';
import bcrypt from 'bcryptjs';
import { User, CreateUserData, UpdateUserData } from '../models/User';

export class UserService {
  static async createUser(userData: CreateUserData): Promise<User> {
    const { email, password, full_name, role, skills, university, graduation_year, company_name, company_description } = userData;
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO users (email, password_hash, full_name, role, skills, university, graduation_year, company_name, bio)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      email,
      hashedPassword,
      full_name,
      role,
      skills || null,
      university || null,
      graduation_year || null,
      company_name || null,
      company_description || null
    ];
    
    try {
      const result = await pool.query(query, values);
      const user = result.rows[0];
      
      // Remove password from returned user object
      const { password_hash: _, ...userWithoutPassword } = user;
      return userWithoutPassword as User;
    } catch (error: any) {
      if (error.code === '23505') { // Unique violation
        throw new Error('Email already exists');
      }
      throw error;
    }
  }
  
  static async findUserByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    return result.rows[0] || null;
  }
  
  static async findUserByEmailForAuth(email: string): Promise<any | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(query, [email]);
    
    return result.rows[0] || null;
  }
  
  static async findUserById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    
    if (result.rows[0]) {
      const { password_hash, ...userWithoutPassword } = result.rows[0];
      return userWithoutPassword as User;
    }
    
    return null;
  }
  
  static async updateUser(id: string, updateData: UpdateUserData): Promise<User | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }
    
    if (fields.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(id);
    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows[0]) {
      const { password_hash, ...userWithoutPassword } = result.rows[0];
      return userWithoutPassword as User;
    }
    
    return null;
  }
  
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }
  
  static async createPasswordResetToken(userId: string): Promise<string> {
    // Generate a random token
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now
    
    const query = `
      INSERT INTO password_reset_tokens (user_id, token, expires_at)
      VALUES ($1, $2, $3)
      RETURNING token
    `;
    
    const result = await pool.query(query, [userId, token, expiresAt]);
    return result.rows[0].token;
  }
  
  static async validatePasswordResetToken(token: string): Promise<string | null> {
    const query = `
      SELECT user_id FROM password_reset_tokens 
      WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP AND used = FALSE
    `;
    
    const result = await pool.query(query, [token]);
    return result.rows[0]?.user_id || null;
  }
  
  static async markPasswordResetTokenAsUsed(token: string): Promise<void> {
    const query = 'UPDATE password_reset_tokens SET used = TRUE WHERE token = $1';
    await pool.query(query, [token]);
  }
  
  static async updatePassword(userId: string, newPassword: string): Promise<void> {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    const query = 'UPDATE users SET password_hash = $1 WHERE id = $2';
    await pool.query(query, [hashedPassword, userId]);
  }
}