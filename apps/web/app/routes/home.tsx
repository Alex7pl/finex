import { ApiError } from "@/libs/http.js";
import { routeHandler } from "@/libs/route-handler.js";
import { login, register } from "@/modules/auth/auth.api.js";
import type { AuthActionData, AuthActionFailure, AuthMode, AuthSubmission } from "@/modules/auth/auth.types.js";
import { hasErrors, validateLogin, validateRegister } from "@/modules/auth/auth.validation.js";
import { AuthPanel } from "@/modules/auth/components/AuthPanel.js";
import { HomePage } from "@/modules/home/components/HomePage.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [{ title: "FineX" }];
}

function readString(data: FormData, key: string): string {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
}

function localAuthError(error: unknown, intent: AuthMode): AuthActionFailure | null {
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

export const clientAction = routeHandler(async ({ request }: Route.ClientActionArgs): Promise<AuthActionData> => {
  const data = await request.formData();
  const intent = readString(data, "intent");

  if (intent === "login") {
    const input = {
      email: readString(data, "email").trim().toLowerCase(),
      password: readString(data, "password"),
    };
    const fieldErrors = validateLogin(input);
    if (hasErrors(fieldErrors)) return { ok: false, intent, fieldErrors };

    try {
      await login(input, request);
      return { ok: true, intent };
    } catch (error) {
      const localError = localAuthError(error, intent);
      if (localError) return localError;
      throw error;
    }
  }

  if (intent === "register") {
    const input = {
      username: readString(data, "username").trim(),
      email: readString(data, "email").trim().toLowerCase(),
      password: readString(data, "password"),
      terms: readString(data, "terms") === "true",
    };
    const fieldErrors = validateRegister(input);
    if (hasErrors(fieldErrors)) return { ok: false, intent, fieldErrors };

    try {
      await register(input, request);
      return { ok: true, intent };
    } catch (error) {
      const localError = localAuthError(error, intent);
      if (localError) return localError;
      throw error;
    }
  }

  return {
    ok: false,
    intent: "login",
    fieldErrors: {},
    formError: "No hemos podido procesar la solicitud.",
  };
});

export default function Home() {
  const fetcher = useFetcher<typeof clientAction>();
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [authFeedback, setAuthFeedback] = useState<AuthActionData | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  function openAuth(mode: AuthMode, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setAuthFeedback(null);
    setAuthMode(mode);
  }

  function changeAuthMode(mode: AuthMode) {
    setAuthFeedback(null);
    setAuthMode(mode);
  }

  function submitAuth(input: AuthSubmission) {
    setAuthFeedback(null);
    const submission = input.intent === "register"
      ? { ...input, terms: input.terms ? "true" : "false" }
      : input;
    fetcher.submit(submission, { method: "post" });
  }

  const closeAuth = useCallback(() => {
    setAuthMode(null);
    setAuthFeedback(null);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  useEffect(() => {
    if (fetcher.data) setAuthFeedback(fetcher.data);
  }, [fetcher.data]);

  return (
    <HomePage
      authOpen={authMode !== null}
      onLogin={(trigger) => openAuth("login", trigger)}
      onRegister={(trigger) => openAuth("register", trigger)}
      authPanel={authMode ? (
        <AuthPanel
          mode={authMode}
          feedback={authFeedback}
          pending={fetcher.state !== "idle"}
          onModeChange={changeAuthMode}
          onSubmit={submitAuth}
          onClose={closeAuth}
        />
      ) : null}
    />
  );
}
