import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
    });
  }

  if (err && typeof err === "object" && "name" in err && err.name === "ZodError") {
    return res.status(400).json({
      error: "Validation failed",
      details: (err as unknown as { issues: unknown }).issues,
    });
  }

  console.error(err);
  return res.status(500).json({ error: "Internal server error" });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
