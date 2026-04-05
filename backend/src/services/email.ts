import nodemailer from 'nodemailer';
import { config } from '../config/env';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

export const sendResetEmail = async (to: string, resetToken: string) => {
  const resetUrl = `${config.isProduction ? 'https://rapidgig.local' : 'http://localhost:5173'}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: config.email.from,
    to,
    subject: 'RapidGig — Password Reset',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2 style="color: #4F46E5;">RapidGig Password Reset</h2>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #4F46E5; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0;">Reset Password</a>
        <p style="color: #999; font-size: 14px;">This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
        <p style="color: #999; font-size: 12px;">If the button doesn't work, copy this URL into your browser:</p>
        <p style="word-break: break-all; font-size: 13px;">${resetUrl}</p>
      </div>
    `,
  });
};
