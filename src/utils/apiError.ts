import { Request, Response, NextFunction, RequestHandler } from "express";

// Custom error class carrying an HTTP status code, so our central error
// handler can respond with the right code + a clean JSON error message.
export class ApiError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Wraps an async route handler so thrown errors / rejected promises are
// forwarded to Express's error-handling middleware instead of crashing
// the process or requiring try/catch in every route.
export function asyncHandler(fn: RequestHandler): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
