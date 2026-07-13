import {
  HttpErrorResponse,
  type HttpErrorResponse as HttpErrorResponseType,
} from "@finex/shared/errors.js";
import { Schema } from "effect";

const DEFAULT_API_URL = "http://localhost:3000";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly requestId?: string,
  ) {
    super(`API request failed with ${status} ${code}`);
    this.name = "ApiError";
  }
}

export interface HttpOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  request?: Request;
}

export function decodeHttpErrorResponse(
  value: unknown,
): HttpErrorResponseType | null {
  try {
    return Schema.decodeUnknownSync(HttpErrorResponse)(value);
  } catch {
    return null;
  }
}

async function readError(
  response: Response,
): Promise<HttpErrorResponseType | null> {
  try {
    const value: unknown = await response.json();
    return decodeHttpErrorResponse(value);
  } catch {
    return null;
  }
}

export function resolveApiUrl(path: string, apiUrl: string): URL {
  const base = new URL(apiUrl);
  base.pathname = `${base.pathname.replace(/\/+$/, "")}/`;
  return new URL(path.replace(/^\/+/, ""), base);
}

interface HttpClientOptions {
  apiUrl: string;
  fetchImpl?: typeof fetch;
  isServer?: boolean;
}

export function createHttp({
  apiUrl,
  fetchImpl = fetch,
  isServer = typeof window === "undefined",
}: HttpClientOptions) {
  const apiOrigin = new URL(apiUrl).origin;
  let refreshInFlight: Promise<void> | null = null;

  return async function http<T>(
    path: string,
    options: HttpOptions = {},
  ): Promise<T> {
    const url = resolveApiUrl(path, apiUrl);

    if (url.origin !== apiOrigin) {
      throw new ApiError(400, "UntrustedApiOrigin");
    }

    const { body, headers: initialHeaders, request, ...init } = options;
    const headers = new Headers(initialHeaders);

    if (body !== undefined && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }

    if (isServer && request && !headers.has("cookie")) {
      const cookie = request.headers.get("cookie");
      if (cookie) headers.set("cookie", cookie);
    }

    const requestInit: RequestInit = {
      ...init,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "include",
      headers,
    };

    const send = async (requestUrl: URL, requestOptions: RequestInit) => {
      try {
        return await fetchImpl(requestUrl, requestOptions);
      } catch {
        throw new ApiError(503, "NetworkError");
      }
    };

    let response = await send(url, requestInit);

    const refreshUrl = resolveApiUrl("/auth/refresh", apiUrl);
    if (response.status === 401 && !isServer && url.href !== refreshUrl.href) {
      if (!refreshInFlight) {
        refreshInFlight = (async () => {
          const refreshResponse = await send(refreshUrl, {
            method: "POST",
            credentials: "include",
          });
          if (!refreshResponse.ok) {
            const payload = await readError(refreshResponse);
            throw new ApiError(
              refreshResponse.status,
              payload?.error.code || "HttpError",
              payload?.error.requestId,
            );
          }
        })().finally(() => {
          refreshInFlight = null;
        });
      }
      await refreshInFlight;
      response = await send(url, requestInit);
    }

    if (!response.ok) {
      const payload = await readError(response);
      const error = new ApiError(
        response.status,
        payload?.error.code || "HttpError",
        payload?.error.requestId,
      );

      throw error;
    }

    if (response.status === 204) return undefined as T;

    try {
      return (await response.json()) as T;
    } catch {
      throw new ApiError(502, "InvalidJsonResponse");
    }
  };
}

export const http = createHttp({
  apiUrl: import.meta.env?.VITE_API_URL || DEFAULT_API_URL,
});
