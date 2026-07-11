import type { CorsOptions } from "cors";

export function createCorsOptions(webOrigin: string): CorsOptions {
  return {
    origin: (origin, callback) => callback(null, origin === webOrigin),
    credentials: true,
  };
}
