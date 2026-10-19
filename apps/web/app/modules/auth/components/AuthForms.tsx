import { Check } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AuthActionFailure, LoginSubmission, RegisterSubmission } from "../auth.types.js";
import { passwordChecks } from "../auth.validation.js";
import { AuthField, FormAlert, PasswordField, SubmitButton } from "./AuthUi.js";

interface LoginFormProps {
  feedback?: Extract<AuthActionFailure, { intent: "login" }> | null;
  pending: boolean;
  onSubmit: (input: LoginSubmission) => void;
  onSwitch: () => void;
}

export function LoginForm({ feedback, pending, onSubmit, onSwitch }: LoginFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const firstError = feedback && Object.keys(feedback.fieldErrors)[0];
    if (firstError) {
      (formRef.current?.elements.namedItem(firstError) as HTMLElement | null)?.focus();
    }
  }, [feedback]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit({
      intent: "login",
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-5">
      <FormAlert>{feedback?.formError}</FormAlert>
      <AuthField.Root error={feedback?.fieldErrors.email}>
        <AuthField.Label>Correo electrónico</AuthField.Label>
        <AuthField.Control name="email" type="email" autoComplete="email" inputMode="email" placeholder="tu@correo.com" />
        <AuthField.Error />
      </AuthField.Root>
      <div>
        <div className="mb-2 flex items-center justify-end">
          <a href="mailto:soporte@finex.app?subject=Recuperar%20contraseña" className="text-sm font-medium text-primary transition hover:text-primary-hover">¿Has olvidado tu contraseña?</a>
        </div>
        <PasswordField label="Contraseña" name="password" autoComplete="current-password" placeholder="Tu contraseña" error={feedback?.fieldErrors.password} />
      </div>
      <SubmitButton pending={pending}>Iniciar sesión</SubmitButton>
      <p className="text-center text-sm text-muted">¿Todavía no tienes cuenta? <button type="button" onClick={onSwitch} className="font-semibold text-primary transition hover:text-primary-hover">Créala gratis</button></p>
    </form>
  );
}

interface RegisterFormProps {
  feedback?: Extract<AuthActionFailure, { intent: "register" }> | null;
  pending: boolean;
  onSubmit: (input: RegisterSubmission) => void;
}

export function RegisterForm({ feedback, pending, onSubmit }: RegisterFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [password, setPassword] = useState("");
  const checks = passwordChecks(password);

  useEffect(() => {
    const firstError = feedback && Object.keys(feedback.fieldErrors)[0];
    if (firstError) {
      (formRef.current?.elements.namedItem(firstError) as HTMLElement | null)?.focus();
    }
  }, [feedback]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSubmit({
      intent: "register",
      username: String(data.get("username") ?? ""),
      email: String(data.get("email") ?? ""),
      password,
      terms: data.get("terms") === "on",
    });
  }

  return (
    <form ref={formRef} onSubmit={submit} noValidate className="space-y-3.5">
      <FormAlert>{feedback?.formError}</FormAlert>
      <div className="grid gap-3.5 sm:grid-cols-2">
        <AuthField.Root error={feedback?.fieldErrors.username}>
          <AuthField.Label>Nombre</AuthField.Label>
          <AuthField.Control name="username" autoComplete="name" placeholder="Tu nombre" />
          <AuthField.Error />
        </AuthField.Root>
        <AuthField.Root error={feedback?.fieldErrors.email}>
          <AuthField.Label>Correo electrónico</AuthField.Label>
          <AuthField.Control name="email" type="email" autoComplete="email" inputMode="email" placeholder="tu@correo.com" />
          <AuthField.Error />
        </AuthField.Root>
      </div>
      <PasswordField
        label="Contraseña"
        name="password"
        autoComplete="new-password"
        placeholder="Crea una contraseña segura"
        value={password}
        error={feedback?.fieldErrors.password}
        onChange={(event) => setPassword(event.target.value)}
        hint={
          <ul className="flex flex-wrap gap-x-4 gap-y-1" aria-label="Requisitos de contraseña">
            {checks.map((check) => (
              <li key={check.label} className={`flex items-center gap-1.5 text-xs ${check.valid ? "text-primary-hover" : "text-muted"}`}>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />{check.label}
              </li>
            ))}
          </ul>
        }
      />
      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-muted">
          <input name="terms" type="checkbox" className="mt-1 h-4 w-4 rounded border-border accent-primary" aria-invalid={Boolean(feedback?.fieldErrors.terms)} aria-describedby={feedback?.fieldErrors.terms ? "terms-error" : undefined} />
          <span>Acepto los términos de uso y la política de privacidad de FineX.</span>
        </label>
        {feedback?.fieldErrors.terms ? <p id="terms-error" className="mt-2 text-sm text-danger">{feedback.fieldErrors.terms}</p> : null}
      </div>
      <SubmitButton pending={pending}>Crear mi cuenta</SubmitButton>
    </form>
  );
}
