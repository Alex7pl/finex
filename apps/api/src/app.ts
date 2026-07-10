import cors from "cors";
import express from "express";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { authRouter } from "./modules/auth/auth.handlers.js";
import { usersRouter } from "./modules/users/users.router.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(authMiddleware);

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/auth", authRouter);
  app.use("/users", usersRouter);

  return app;
}
