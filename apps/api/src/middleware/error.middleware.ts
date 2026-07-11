import crypto from "node:crypto";
import type { ErrorRequestHandler } from "express";
import type { HttpErrorResponse } from "@finex/shared/errors.js";

export const errorMiddleware: ErrorRequestHandler = (error, _req, res, _next) => {
  if (res.headersSent) {
    _next(error);
    return;
  }

  const requestId = res.locals.requestId || crypto.randomUUID();
  res.locals.requestId = requestId;

  console.error("Unexpected API error", { requestId, error });

  const body: HttpErrorResponse = {
    error: {
      code: "InternalServerError",
      requestId,
    },
  };

  res.status(500).json(body);
};
