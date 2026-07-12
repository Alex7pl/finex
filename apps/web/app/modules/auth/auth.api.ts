import {
  LoginResponse,
  RegisterResponse,
  type LoginInput,
  type RegisterInput,
} from "@finex/shared/auth/auth.schema.js";
import { Schema } from "effect";
import { http } from "@/libs/http.js";

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

    async register(input: RegisterInput, request?: Request): Promise<RegisterResponse> {
      const raw = await client<unknown>("/auth/register", {
        method: "POST",
        body: input,
        request,
      });
      return Schema.decodeUnknownSync(RegisterResponse)(raw);
    },
  };
}

export const { login, register } = createAuthApi(http);
