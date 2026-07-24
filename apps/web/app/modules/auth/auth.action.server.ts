import { ApiError } from "@/libs/api-error.js";
import type { ServerHttpResult } from "@/libs/http.server.js";
import type {
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
} from "@finex/shared/auth/auth.schema.js";
import { data } from "react-router";
import { authApi } from "./auth.api.server.js";
import type {
  AuthActionData,
  AuthActionFailure,
  AuthMode,
} from "./auth.types.js";
import {
  hasErrors,
  validateLogin,
  validateRegister,
} from "./auth.validation.js";

interface AuthApi {
  login(
    input: LoginInput,
    request: Request,
  ): Promise<ServerHttpResult<LoginResponse>>;
  register(
    input: RegisterInput,
    request: Request,
  ): Promise<ServerHttpResult<RegisterResponse>>;
}

function readString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === "string" ? value : "";
}

function expectedAuthError(
  error: unknown,
  intent: AuthMode,
): AuthActionFailure | null {
  if (!(error instanceof ApiError)) return null;

  if (intent === "login" && error.code === "UserNotFound") {
    return {
      ok: false,
      intent,
      fieldErrors: {},
      formError: "El correo o la contraseña no son correctos.",
    };
  }
  if (intent === "register" && error.code === "UserAlreadyExists") {
    return {
      ok: false,
      intent,
      fieldErrors: {},
      formError: "Ya existe una cuenta con ese correo o nombre de usuario.",
    };
  }
  return null;
}

function actionData(payload: AuthActionData, headers?: Headers) {
  return data<AuthActionData>(payload, headers ? { headers } : undefined);
}

export function createAuthAction(api: AuthApi) {
  return async function handleAuthSubmission(request: Request) {
    const form = await request.formData();
    const intent = readString(form, "intent");

    if (intent === "login") {
      const input = {
        email: readString(form, "email").trim().toLowerCase(),
        password: readString(form, "password"),
      };
      const fieldErrors = validateLogin(input);
      if (hasErrors(fieldErrors)) {
        return actionData({ ok: false, intent, fieldErrors });
      }

      try {
        const result = await api.login(input, request);
        return actionData({ ok: true, intent }, result.headers);
      } catch (error) {
        const localError = expectedAuthError(error, intent);
        if (localError) {
          return actionData(localError, (error as ApiError).headers);
        }
        throw error;
      }
    }

    if (intent === "register") {
      const input = {
        username: readString(form, "username").trim(),
        email: readString(form, "email").trim().toLowerCase(),
        password: readString(form, "password"),
        terms: readString(form, "terms") === "true",
      };
      const fieldErrors = validateRegister(input);
      if (hasErrors(fieldErrors)) {
        return actionData({ ok: false, intent, fieldErrors });
      }

      try {
        const result = await api.register(input, request);
        return actionData({ ok: true, intent }, result.headers);
      } catch (error) {
        const localError = expectedAuthError(error, intent);
        if (localError) {
          return actionData(localError, (error as ApiError).headers);
        }
        throw error;
      }
    }

    return actionData({
      ok: false,
      intent: "login",
      fieldErrors: {},
      formError: "No hemos podido procesar la solicitud.",
    });
  };
}

export const handleAuthSubmission = createAuthAction(authApi);
