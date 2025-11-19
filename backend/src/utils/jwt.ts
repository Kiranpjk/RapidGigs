import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
}

export const generateToken = (payload: TokenPayload): string => {
  const secret = config.jwt.secret as string;
  const expiresIn = config.jwt.expiresIn as string;
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = (token: string): TokenPayload => {
  const secret = config.jwt.secret as string;
  return jwt.verify(token, secret) as TokenPayload;
};