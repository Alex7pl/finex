import { notify } from "@/libs/notifications.js";
import { routeAction, routeHandler } from "@/libs/route-handler.server.js";
import { handleAuthSubmission } from "@/modules/auth/auth.action.server.js";
import { authApi } from "@/modules/auth/auth.api.server";
import type {
  AuthActionData,
  AuthMode,
  AuthSubmission,
} from "@/modules/auth/auth.types.js";
import { AuthPanel } from "@/modules/auth/components/AuthPanel.js";
import { HomePage } from "@/modules/home/components/HomePage.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { data, useFetcher } from "react-router";
import type { Route } from "./+types/home";

export function meta({ }: Route.MetaArgs) {
  return [{ title: "FineX" }];
}

export const action = routeAction(
  async ({ request }: Route.ActionArgs) => handleAuthSubmission(request),
);

export const loader = routeHandler(
  async ({ request }: Route.LoaderArgs) => {
    const result = await authApi.verifyLogin(request);

    return data(
      { authenticated: result.data },
      { headers: result.headers },
    );
  },
);

export default function Home({ loaderData }: Route.ComponentProps) {
  const fetcher = useFetcher<typeof action>();
  const { authenticated } = loaderData;
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
    const submission =
      input.intent === "register"
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
    const result = fetcher.data;
    if (!result) return;

    setAuthFeedback(result);

    if (result.ok) {
      const message =
        result.intent === "login"
          ? "Sesión iniciada correctamente."
          : "Cuenta creada. ¡Bienvenido a FineX!";
      notify.success(message);
    }
  }, [fetcher.data]);

  return (
    <HomePage
      userAuthenticated={authenticated}
      authOpen={authMode !== null}
      onLogin={(trigger) => openAuth("login", trigger)}
      onRegister={(trigger) => openAuth("register", trigger)}
      authPanel={
        authMode ? (
          <AuthPanel
            mode={authMode}
            feedback={authFeedback}
            pending={fetcher.state !== "idle"}
            onModeChange={changeAuthMode}
            onSubmit={submitAuth}
            onClose={closeAuth}
          />
        ) : null
      }
    />
  );
}
