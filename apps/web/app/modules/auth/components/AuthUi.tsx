import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import {
  createContext,
  useContext,
  useId,
  useState,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
} from "react";

interface AuthFieldContextValue {
  controlId: string;
  descriptionId: string;
  errorId: string;
  description?: ReactNode;
  error?: ReactNode;
}

const AuthFieldContext = createContext<AuthFieldContextValue | null>(null);

function useAuthField() {
  const field = useContext(AuthFieldContext);
  if (!field) {
    throw new Error("AuthField parts must be rendered inside AuthField.Root.");
  }
  return field;
}

type AuthFieldRootProps = Omit<HTMLAttributes<HTMLDivElement>, "id"> & {
  id?: string;
  description?: ReactNode;
  error?: ReactNode;
};

function AuthFieldRoot({
  id: providedId,
  description,
  error,
  children,
  ...props
}: AuthFieldRootProps) {
  const generatedId = useId();
  const controlId = providedId ?? generatedId;
  const field = {
    controlId,
    descriptionId: `${controlId}-description`,
    errorId: `${controlId}-error`,
    description,
    error,
  };

  return (
    <AuthFieldContext value={field}>
      <div {...props}>{children}</div>
    </AuthFieldContext>
  );
}

function AuthFieldLabel({
  className = "",
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  const { controlId } = useAuthField();
  return (
    <label
      {...props}
      htmlFor={controlId}
      className={`mb-2 block text-xs font-semibold text-surface-heading ${className}`}
    />
  );
}

function AuthFieldControl({
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "id">) {
  const { controlId, description, descriptionId, error, errorId } =
    useAuthField();
  const describedBy = [error ? errorId : "", description ? descriptionId : ""]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <input
      {...props}
      id={controlId}
      aria-invalid={Boolean(error)}
      aria-describedby={describedBy}
      className={`field h-12 w-full px-4 text-base ${className}`}
    />
  );
}

function AuthFieldDescription(props: HTMLAttributes<HTMLDivElement>) {
  const { description, descriptionId } = useAuthField();
  if (!description) return null;
  return (
    <div {...props} id={descriptionId} className={`mt-2 ${props.className ?? ""}`}>
      {description}
    </div>
  );
}

function AuthFieldError(props: HTMLAttributes<HTMLParagraphElement>) {
  const { error, errorId } = useAuthField();
  if (!error) return null;
  return (
    <p
      {...props}
      id={errorId}
      className={`mt-2 text-sm text-danger ${props.className ?? ""}`}
    >
      {error}
    </p>
  );
}

export const AuthField = {
  Root: AuthFieldRoot,
  Label: AuthFieldLabel,
  Control: AuthFieldControl,
  Description: AuthFieldDescription,
  Error: AuthFieldError,
};

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
};

export function PasswordField({
  label,
  error,
  hint,
  id,
  className = "",
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <AuthField.Root id={id} error={error} description={hint}>
        <AuthField.Label>{label}</AuthField.Label>
        <AuthField.Control
          {...props}
          type={visible ? "text" : "password"}
          className={`${className} pr-12`}
        />
        <AuthField.Description />
        <AuthField.Error />
      </AuthField.Root>
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="absolute right-3 top-[38px] grid h-9 w-9 place-items-center rounded-control text-muted transition hover:bg-[#eae2d2] hover:text-primary focus-visible:outline-2 focus-visible:outline-gold-deep"
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
      className="action-primary flex h-12 w-full items-center justify-center gap-2 rounded-control px-6 font-semibold disabled:cursor-not-allowed disabled:opacity-65"
    >
      {pending ? <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
      {pending ? "Un momento…" : children}
    </button>
  );
}

export function FormAlert({ children }: { children?: ReactNode }) {
  return children ? <div role="alert" className="rounded-notice border border-[#ddb39c] bg-[#f6e3d8] px-4 py-3 text-sm leading-6 text-[#5a2412]">{children}</div> : null;
}
