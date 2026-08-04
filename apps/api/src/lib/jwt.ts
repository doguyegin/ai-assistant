import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Role } from "@ai-assistant/shared";

export type AccessPayload = {
  sub: string;
  email: string;
  tenantId: string | null;
  role: Role | null;
  type: "access";
};

export type RefreshPayload = {
  sub: string;
  tokenId: string;
  type: "refresh";
};

export function signAccessToken(payload: Omit<AccessPayload, "type">) {
  return jwt.sign({ ...payload, type: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(payload: Omit<RefreshPayload, "type">) {
  return jwt.sign({ ...payload, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessPayload;
  if (payload.type !== "access") throw new Error("Invalid token type");
  return payload;
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshPayload;
  if (payload.type !== "refresh") throw new Error("Invalid token type");
  return payload;
}
