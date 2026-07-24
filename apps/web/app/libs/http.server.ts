import {
  HttpErrorResponse,
  type HttpErrorResponse as HttpErrorResponseType,
} from "@finex/shared/errors.js";
import { Schema } from "effect";
import { ApiError } from "./api-error.js";

const DEFAULT_API_URL = "http://localhost:3000";

export interface ServerHttpResult<T> {
  data: T;
  headers: Headers;
}

export interface ServerHttpOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  request: Request;
}

export type ServerHttpClient = <T>(
  path: string,
  options: ServerHttpOptions,
) => Promise<ServerHttpResult<T>>;

interface ServerHttpClientOptions {
  apiUrl: string;
  fetchImpl?: typeof fetch;
}

interface RefreshOutcome {
  ok: boolean;
  status: number;
  code: string;
  requestId?: string;
  cookieHeader: string;
  setCookies: string[];
}

type HeadersWithSetCookie = Headers & {
  getSetCookie?: () => string[];
};

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

function responseSetCookies(response: Response): string[] {
  const headers = response.headers as HeadersWithSetCookie;
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const value = headers.get("set-cookie");
  return value ? [value] : [];
}

function responseHeaders(setCookies: readonly string[]): Headers {
  const headers = new Headers();
  for (const cookie of setCookies) headers.append("set-cookie", cookie);
  return headers;
}

function cookieMap(cookieHeader: string): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName) cookies.set(rawName, rawValue.join("="));
  }
  return cookies;
}

export function mergeResponseCookies(
  cookieHeader: string,
  setCookies: readonly string[],
): string {
  const cookies = cookieMap(cookieHeader);

  for (const setCookie of setCookies) {
    const [pair] = setCookie.split(";", 1);
    const [rawName, ...rawValue] = pair.split("=");
    const name = rawName.trim();
    if (!name) continue;

    const value = rawValue.join("=");
    if (value) cookies.set(name, value);
    else cookies.delete(name);
  }

  return [...cookies.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function cookieValue(cookieHeader: string, name: string): string | null {
  return cookieMap(cookieHeader).get(name) ?? null;
}

export function createServerHttp({
  apiUrl,
  fetchImpl = fetch,
}: ServerHttpClientOptions): ServerHttpClient {
  const apiOrigin = new URL(apiUrl).origin;
  const refreshInFlight = new Map<string, Promise<RefreshOutcome>>();

  const send = async (url: URL, init: RequestInit): Promise<Response> => {
    try {
      return await fetchImpl(url, init);
    } catch {
      throw new ApiError(503, "NetworkError");
    }
  };

  const refresh = async (
    request: Request,
    cookieHeader: string,
  ): Promise<RefreshOutcome> => {
    const headers = new Headers({
      origin: new URL(request.url).origin,
    });
    if (cookieHeader) headers.set("cookie", cookieHeader);

    const response = await send(resolveApiUrl("/auth/refresh", apiUrl), {
      method: "POST",
      headers,
    });
    const setCookies = responseSetCookies(response);
    const payload = response.ok ? null : await readError(response);

    return {
      ok: response.ok,
      status: response.status,
      code: payload?.error.code ?? "HttpError",
      requestId: payload?.error.requestId,
      cookieHeader: mergeResponseCookies(cookieHeader, setCookies),
      setCookies,
    };
  };

  const refreshOnce = (
    request: Request,
    cookieHeader: string,
  ): Promise<RefreshOutcome> => {
    const refreshToken = cookieValue(cookieHeader, "refreshToken");
    if (!refreshToken) return refresh(request, cookieHeader);

    const existing = refreshInFlight.get(refreshToken);
    if (existing) return existing;

    const pending = refresh(request, cookieHeader).finally(() => {
      refreshInFlight.delete(refreshToken);
    });
    refreshInFlight.set(refreshToken, pending);
    return pending;
  };

  return async function serverHttp<T>(
    path: string,
    options: ServerHttpOptions,
  ): Promise<ServerHttpResult<T>> {
    const url = resolveApiUrl(path, apiUrl);
    if (url.origin !== apiOrigin) {
      throw new ApiError(400, "UntrustedApiOrigin");
    }

    const {
      body,
      headers: initialHeaders,
      request,
      ...initialInit
    } = options;
    const headers = new Headers(initialHeaders);
    const incomingCookie = request.headers.get("cookie") ?? "";

    if (body !== undefined && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    if (incomingCookie && !headers.has("cookie")) {
      headers.set("cookie", incomingCookie);
    }
    if (!headers.has("origin")) {
      headers.set("origin", new URL(request.url).origin);
    }

    const requestInit: RequestInit = {
      ...initialInit,
      body: body === undefined ? undefined : JSON.stringify(body),
      headers,
    };

    let response = await send(url, requestInit);
    const setCookies = responseSetCookies(response);
    const refreshUrl = resolveApiUrl("/auth/refresh", apiUrl);

    if (response.status === 401 && url.href !== refreshUrl.href) {
      const refreshOutcome = await refreshOnce(request, incomingCookie);
      setCookies.push(...refreshOutcome.setCookies);

      if (!refreshOutcome.ok) {
        throw new ApiError(
          refreshOutcome.status,
          refreshOutcome.code,
          refreshOutcome.requestId,
          responseHeaders(setCookies),
        );
      }

      const retryHeaders = new Headers(headers);
      if (refreshOutcome.cookieHeader) {
        retryHeaders.set("cookie", refreshOutcome.cookieHeader);
      } else {
        retryHeaders.delete("cookie");
      }
      response = await send(url, { ...requestInit, headers: retryHeaders });
      setCookies.push(...responseSetCookies(response));
    }

    const outgoingHeaders = responseHeaders(setCookies);
    if (!response.ok) {
      const payload = await readError(response);
      throw new ApiError(
        response.status,
        payload?.error.code ?? "HttpError",
        payload?.error.requestId,
        outgoingHeaders,
      );
    }

    if (response.status === 204) {
      return { data: undefined as T, headers: outgoingHeaders };
    }

    try {
      return {
        data: (await response.json()) as T,
        headers: outgoingHeaders,
      };
    } catch {
      throw new ApiError(
        502,
        "InvalidJsonResponse",
        undefined,
        outgoingHeaders,
      );
    }
  };
}

export const serverHttp = createServerHttp({
  apiUrl: process.env.API_URL || DEFAULT_API_URL,
});
