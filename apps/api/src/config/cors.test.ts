import assert from "node:assert/strict";
import test from "node:test";
import cors from "cors";
import express from "express";
import { createCorsOptions } from "./cors.js";

test("allows credentialed preflight requests from the configured web origin", async () => {
  const webOrigin = "https://web.example.com";
  const app = express();
  app.use(cors(createCorsOptions(webOrigin)));

  const server = app.listen(0);

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");

    const response = await fetch(`http://127.0.0.1:${address.port}/resource`, {
      method: "OPTIONS",
      headers: {
        origin: webOrigin,
        "access-control-request-method": "GET",
      },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), webOrigin);
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("does not authorize preflight requests from an untrusted origin", async () => {
  const webOrigin = "https://web.example.com";
  const app = express();
  app.use(cors(createCorsOptions(webOrigin)));

  const server = app.listen(0);

  try {
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    assert.ok(address && typeof address !== "string");

    const response = await fetch(`http://127.0.0.1:${address.port}/resource`, {
      method: "OPTIONS",
      headers: {
        origin: "https://untrusted.example.com",
        "access-control-request-method": "GET",
      },
    });

    assert.equal(response.headers.get("access-control-allow-origin"), null);
    assert.equal(response.headers.get("access-control-allow-credentials"), null);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
