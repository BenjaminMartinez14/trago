import { SignJWT, jwtVerify } from "jose";

export type StaffJWTPayload = {
  sub: string;       // staff user id
  venueId: string;
  role: "scanner" | "admin";
  name: string;
};

function getSecret(): Uint8Array {
  const secret = process.env.STAFF_JWT_SECRET;
  if (!secret) throw new Error("STAFF_JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signStaffToken(payload: StaffJWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function verifyStaffToken(token: string): Promise<StaffJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as StaffJWTPayload;
  } catch {
    return null;
  }
}

export function getStaffTokenFromRequest(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ")) return auth.slice(7);
  return null;
}
