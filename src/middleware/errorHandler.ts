import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/apiError";

// Central error handler — every thrown error in the app ends up here via
// asyncHandler or Express's own synchronous error propagation.
// Keeps API error responses consistent: { error: { message, details? } }
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, details: err.details },
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { message: "Validation failed", details: err.flatten() },
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        error: { message: `Duplicate value for unique field: ${err.meta?.target}` },
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: { message: "Record not found" } });
    }
    return res.status(400).json({ error: { message: "Database request error", details: err.code } });
  }

  console.error("Unexpected error:", err);
  return res.status(500).json({ error: { message: "Internal server error" } });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
}
