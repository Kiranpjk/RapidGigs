import jwt from "jsonwebtoken";

export const generateToken = (payload: object) => {

  const secret = process.env.JWT_SECRET;

  // Type safety: prevent undefined secret
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not defined");
  }

  // Cast secret as string to satisfy TypeScript
  return jwt.sign(
    payload,
    secret as string,
    {
      expiresIn: "1d",
    }
  );
};
