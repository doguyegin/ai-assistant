import type { Request } from "express";
import { AppError } from "../middleware/error.js";

export function param(req: Request, name: string): string {
  const value = req.params[name];
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) throw new AppError(`Missing param: ${name}`, 400);
  return raw;
}
