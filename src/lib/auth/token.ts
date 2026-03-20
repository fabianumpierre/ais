import type { JWTPayload } from "jose";
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";

import { DEFAULT_AUTH_SECRET } from "@/lib/auth/constants";

export type SessionRole = "admin" | "editor";

export type SessionTokenPayload = JWTPayload & {
  sub: string;
  email: string;
  name: string;
  role: SessionRole;
  mustChangePassword: boolean;
};

function getAuthSecret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || DEFAULT_AUTH_SECRET);
}

export async function createSessionToken(payload: Omit<SessionTokenPayload, keyof JWTPayload>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getAuthSecret());
}

export async function verifySessionToken(token: string) {
  const verified = await jwtVerify<SessionTokenPayload>(token, getAuthSecret());
  return verified.payload;
}
