import jwt from 'jsonwebtoken';
import { config } from '../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
}

export const generateToken = (payload: TokenPayload): string => {
  const secret = config.jwt.secret;

  // Prevent undefined at runtime + satisfy TypeScript
  if (!secret) {
    throw new Error("JWT secret is missing in config");
  }

  const expiresIn = config.jwt.expiresIn || "1d";

  return jwt.sign(
    payload,
    secret as string,
    {
      expiresIn
    }
  );
};

export const verifyToken = (token: string): TokenPayload => {
  const secret = config.jwt.secret;

  if (!secret) {
    throw new Error("JWT secret is missing in config");
  }

  return jwt.verify(token, secret as string) as TokenPayload;
};
