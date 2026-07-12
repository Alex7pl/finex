import type { FieldErrors, LoginField, RegisterField } from "./auth.validation.js";

export type AuthMode = "login" | "register";

export type LoginSubmission = {
  intent: "login";
  email: string;
  password: string;
};

export type RegisterSubmission = {
  intent: "register";
  username: string;
  email: string;
  password: string;
  terms: boolean;
};

export type AuthSubmission = LoginSubmission | RegisterSubmission;

export type AuthActionSuccess = {
  ok: true;
  intent: AuthMode;
};

export type AuthActionFailure =
  | {
      ok: false;
      intent: "login";
      fieldErrors: FieldErrors<LoginField>;
      formError?: string;
    }
  | {
      ok: false;
      intent: "register";
      fieldErrors: FieldErrors<RegisterField>;
      formError?: string;
    };

export type AuthActionData = AuthActionSuccess | AuthActionFailure;
