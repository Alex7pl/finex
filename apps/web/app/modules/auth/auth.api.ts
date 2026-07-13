import { http } from "@/libs/http.js";
import {
  LoginResponse,
  RegisterResponse,
  type LoginInput,
  type RegisterInput,
} from "@finex/shared/auth/auth.schema.js";
import { Schema } from "effect";

type HttpClient = typeof http;

export function createAuthApi(client: HttpClient) {
  return {
    async login(input: LoginInput, request?: Request): Promise<LoginResponse> {
      const raw = await client<unknown>("/auth/login", {
        method: "POST",
        body: input,
        request,
      });
      return Schema.decodeUnknownSync(LoginResponse)(raw);
    },

    async register(
      input: RegisterInput,
      request?: Request,
    ): Promise<RegisterResponse> {
      const raw = await client<unknown>("/auth/register", {
        method: "POST",
        body: input,
        request,
      });
      return Schema.decodeUnknownSync(RegisterResponse)(raw);
    },

    async verifyLogin(request?: Request): Promise<boolean> {
      const raw = await client<unknown>("/auth/verifyLogin", {
        method: "GET",
        request,
      });

      return Schema.decodeUnknownSync(Schema.Boolean)(raw);
    },
  };
}

export const { login, register } = createAuthApi(http);
