import type { NextFunction, Request, Response } from "express";
import { hasPermission, type Role } from "@ai-assistant/shared";
import { verifyAccessToken } from "../lib/jwt.js";
import { AppError } from "./error.js";

export type AuthUser = {
  id: string;
  email: string;
  tenantId: string | null;
  role: Role | null;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", 401));
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = {
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role,
    };
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
}

export function requireTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.user?.tenantId || !req.user.role) {
    return next(new AppError("Tenant context required. Complete onboarding.", 403));
  }
  next();
}

export function requirePermission(permission: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user?.role) {
      return next(new AppError("Forbidden", 403));
    }
    if (!hasPermission(req.user.role, permission)) {
      return next(new AppError("Insufficient permissions", 403));
    }
    next();
  };
}
