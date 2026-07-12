export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export type LoginField = "email" | "password";
export type RegisterField = "username" | "email" | "password" | "terms";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLogin(input: {
  email: string;
  password: string;
}): FieldErrors<LoginField> {
  const errors: FieldErrors<LoginField> = {};
  const email = input.email.trim();

  if (!email) errors.email = "Introduce tu correo electrónico.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Introduce un correo válido.";

  if (!input.password) errors.password = "Introduce tu contraseña.";
  return errors;
}

export function passwordChecks(password: string) {
  return [
    { label: "8 caracteres", valid: password.length >= 8 },
    { label: "Una mayúscula", valid: /[A-Z]/.test(password) },
    { label: "Un número", valid: /\d/.test(password) },
  ];
}

export function validateRegister(input: {
  username: string;
  email: string;
  password: string;
  terms: boolean;
}): FieldErrors<RegisterField> {
  const errors: FieldErrors<RegisterField> = {};
  const username = input.username.trim();
  const email = input.email.trim();

  if (username.length < 2) errors.username = "Escribe un nombre de al menos 2 caracteres.";
  else if (username.length > 40) errors.username = "El nombre no puede superar 40 caracteres.";

  if (!email) errors.email = "Introduce tu correo electrónico.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Introduce un correo válido.";

  if (!passwordChecks(input.password).every((check) => check.valid)) {
    errors.password = "La contraseña todavía no cumple todos los requisitos.";
  }
  if (!input.terms) errors.terms = "Debes aceptar los términos para continuar.";
  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.keys(errors).length > 0;
}
