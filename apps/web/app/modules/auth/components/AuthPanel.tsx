import { LockKeyhole, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthActionData, AuthMode, AuthSubmission } from "../auth.types.js";
import { LoginForm, RegisterForm } from "./AuthForms.js";

const COPY = {
  login: {
    eyebrow: "Bienvenido de nuevo",
    title: "Continúa donde lo dejaste",
    description: "Accede a tu espacio financiero y vuelve a ver tu dinero con claridad.",
  },
  register: {
    eyebrow: "Empieza gratis",
    title: "Tus finanzas, más simples desde hoy",
    description: "Crea tu espacio privado en menos de un minuto. Sin tarjetas ni compromisos.",
  },
};

interface AuthPanelProps {
  mode: AuthMode;
  feedback: AuthActionData | null;
  pending: boolean;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (input: AuthSubmission) => void;
  onClose: () => void;
}

export function AuthPanel({ mode, feedback, pending, onModeChange, onSubmit, onClose }: AuthPanelProps) {
  const copy = COPY[mode];
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const requestClose = useCallback(() => {
    if (closing) return;
    setClosing(true);
    const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 260;
    closeTimer.current = window.setTimeout(onClose, delay);
  }, [closing, onClose]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [requestClose]);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    if (feedback?.ok) requestClose();
  }, [feedback, requestClose]);

  const activeFeedback = feedback && !feedback.ok && feedback.intent === mode ? feedback : null;

  return (
    <>
      <button type="button" className={`${closing ? "auth-backdrop-exit" : "auth-backdrop-enter"} absolute inset-0 z-20 cursor-default bg-hero/35 backdrop-blur-[2px]`} onClick={requestClose} aria-label="Cerrar acceso" />
      <div role="dialog" aria-modal="true" aria-labelledby="auth-panel-title" className={`${closing ? "auth-panel-exit" : "auth-panel-enter"} absolute inset-y-2 left-2 z-30 flex w-[calc(100%-16px)] max-w-[540px] flex-col overflow-y-auto rounded-[22px] border border-white/70 bg-background/[0.97] text-foreground shadow-[0_32px_90px_rgba(7,31,23,0.32)] backdrop-blur-xl sm:inset-y-3 sm:left-3 sm:w-[min(520px,calc(100%-24px))] sm:rounded-[24px]`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/70 bg-background/90 px-5 py-4 backdrop-blur-xl sm:px-8">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground"><LockKeyhole className="h-4 w-4" aria-hidden="true" /></span>
            Acceso seguro
          </div>
          <button type="button" autoFocus onClick={requestClose} className="grid h-10 w-10 place-items-center rounded-full text-muted transition hover:bg-white hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/15" aria-label="Cerrar">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div key={mode} className={`auth-content-enter flex flex-1 flex-col px-5 sm:px-9 ${mode === "register" ? "py-5 sm:py-6" : "py-7 sm:py-9"}`}>
          <div className={`${mode === "register" ? "mb-5" : "mb-7"} grid grid-cols-2 rounded-2xl bg-white/80 p-1 shadow-[inset_0_0_0_1px_rgba(26,71,49,0.08)]`} aria-label="Tipo de acceso">
            <button type="button" disabled={pending} onClick={() => onModeChange("login")} aria-pressed={mode === "login"} className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 ${mode === "login" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:text-primary"}`}>Iniciar sesión</button>
            <button type="button" disabled={pending} onClick={() => onModeChange("register")} aria-pressed={mode === "register"} className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 ${mode === "register" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:text-primary"}`}>Crear cuenta</button>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.19em] text-primary-hover">{copy.eyebrow}</p>
          <h2 id="auth-panel-title" className={`mt-2 font-normal leading-tight tracking-[-0.035em] text-surface-heading ${mode === "register" ? "text-3xl" : "text-3xl sm:text-4xl"}`}>{copy.title}</h2>
          <p className={`text-sm leading-6 text-muted ${mode === "register" ? "mt-2" : "mt-3 sm:text-base"}`}>{copy.description}</p>
          <div className={mode === "register" ? "mt-5" : "mt-7"}>
            {mode === "login" ? (
              <LoginForm feedback={activeFeedback?.intent === "login" ? activeFeedback : null} pending={pending} onSubmit={onSubmit} onSwitch={() => onModeChange("register")} />
            ) : (
              <RegisterForm feedback={activeFeedback?.intent === "register" ? activeFeedback : null} pending={pending} onSubmit={onSubmit} />
            )}
          </div>
          {mode === "login" ? <p className="mt-auto pt-7 text-center text-xs text-muted">Tus datos se transmiten de forma segura.</p> : null}
        </div>
      </div>
    </>
  );
}
