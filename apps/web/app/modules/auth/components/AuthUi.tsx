import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
};

export function AuthField({ label, error, hint, id: providedId, className = "", ...props }: AuthFieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const describedBy = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-surface-heading">{label}</label>
      <input
        {...props}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
        className={`h-12 w-full rounded-2xl border bg-white px-4 text-base text-surface-heading outline-none transition placeholder:text-muted/55 focus:border-primary focus:ring-3 focus:ring-primary/10 ${error ? "border-red-400" : "border-border"} ${className}`}
      />
      {hint ? <div id={`${id}-hint`} className="mt-2">{hint}</div> : null}
      {error ? <p id={`${id}-error`} className="mt-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

export function PasswordField(props: Omit<AuthFieldProps, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <AuthField {...props} type={visible ? "text" : "password"} className={`${props.className ?? ""} pr-12`} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute right-3 top-[38px] grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:bg-background hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/15"
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 font-medium text-primary-foreground transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-65"
    >
      {pending ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Un momento…" : children}
    </button>
  );
}

export function FormAlert({ children }: { children?: ReactNode }) {
  return children ? <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800">{children}</div> : null;
}
