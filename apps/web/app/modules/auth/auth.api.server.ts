import { ApiError } from "@/libs/api-error.js";
import {
  serverHttp,
  type ServerHttpClient,
  type ServerHttpResult,
} from "@/libs/http.server.js";
import {
  LoginResponse,
  RegisterResponse,
  type LoginInput,
  type RegisterInput,
} from "@finex/shared/auth/auth.schema.js";
import { Schema } from "effect";

function decodeResponse<T>(
  result: ServerHttpResult<unknown>,
  schema: Schema.Schema<T>,
): ServerHttpResult<T> {
  try {
    return {
      data: Schema.decodeUnknownSync(schema)(result.data),
      headers: result.headers,
    };
  } catch {
    throw new ApiError(
      502,
      "InvalidApiResponse",
      undefined,
      result.headers,
    );
  }
}

export function createAuthApi(client: ServerHttpClient) {
  return {
    async login(
      input: LoginInput,
      request: Request,
    ): Promise<ServerHttpResult<LoginResponse>> {
      const result = await client<unknown>("/auth/login", {
        method: "POST",
        body: input,
        request,
      });
      return decodeResponse(result, LoginResponse);
    },

    async register(
      input: RegisterInput,
      request: Request,
    ): Promise<ServerHttpResult<RegisterResponse>> {
      const result = await client<unknown>("/auth/register", {
        method: "POST",
        body: input,
        request,
      });
      return decodeResponse(result, RegisterResponse);
    },

    async verifyLogin(
      request: Request,
    ): Promise<ServerHttpResult<boolean>> {
      const result = await client<unknown>("/auth/verifyLogin", {
        method: "GET",
        request,
      });
      return decodeResponse(result, Schema.Boolean);
    },
  };
}

export const authApi = createAuthApi(serverHttp);
