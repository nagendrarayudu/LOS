import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "8h";

export type StaffTokenPayload = {
  sub: string;
  tenantId: string;
  role: string;
  kind: "staff";
};

export type CustomerTokenPayload = {
  sub: string;
  tenantId: string;
  mobile: string;
  kind: "customer";
};

export type TokenPayload = StaffTokenPayload | CustomerTokenPayload;

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
}
