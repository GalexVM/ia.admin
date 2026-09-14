import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "zefiron_admin_ia_jwt_super_secret_key_2026_x99";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export const AUTH_COOKIE_NAME = "admin_token";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export function validateMasterPassword(password: string): boolean {
  const masterPassword = process.env.ADMIN_PASSWORD || "admin123456";
  return password === masterPassword;
}
