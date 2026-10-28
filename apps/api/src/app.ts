import cors from "cors";
import express from "express";
import { createCorsOptions } from "./config/cors.js";
import { env } from "./config/env.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { accountRouter } from "./modules/accounts/accounts.handlers.js";
import { authRouter } from "./modules/auth/auth.handlers.js";
import { transactionRouter } from "./modules/transactions/transactions.handlers.js";
import { usersRouter } from "./modules/users/users.router.js";

export function createApp() {
  const app = express();

  app.use(cors(createCorsOptions(env.WEB_ORIGIN)));
  app.use(express.json());
  app.use(authMiddleware);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/accounts", accountRouter);
  app.use("/transactions", transactionRouter);

  app.use(errorMiddleware);

  return app;
}
