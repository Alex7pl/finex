import express from "express";
import cors from "cors";
import * as trpcExpress from '@trpc/server/adapters/express';
import { appRouter } from "./trpc/router.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter
    })
  )

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}