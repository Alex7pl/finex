import { data } from "react-router";
import { Schema } from "effect";
import { UpdateUserProfileInput } from "@finex/shared/users/users.schema.js";
import { ApiError } from "@/libs/api-error.js";
import { usersApi } from "./users.api.server.js";
import type { ProfileActionData } from "../dashboard/dashboard.types.js";

export function createUpdateProfileAction(api = usersApi) {
  return async function updateProfileAction(request: Request) {
    const form = await request.formData();
    if (form.get("intent") !== "update-profile")
      throw new ApiError(400, "InvalidAction");
    const raw = {
      username: form.get("username"),
      email: form.get("email"),
      ...(form.get("current_password")
        ? { current_password: form.get("current_password") }
        : {}),
    };
    let input: typeof UpdateUserProfileInput.Type;
    try {
      input = Schema.decodeUnknownSync(UpdateUserProfileInput)(raw);
    } catch {
      return data<ProfileActionData>(
        { ok: false, message: "Revisa el nombre y el correo electrónico." },
        { status: 400 },
      );
    }
    try {
      const result = await api.updateProfile(request, input);
      return data<ProfileActionData>({ ok: true }, { headers: result.headers });
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        ![400, 401, 409].includes(error.status)
      )
        throw error;
      const message =
        error.status === 409
          ? "Ese nombre o correo ya está en uso."
          : error.status === 401
            ? "No se pudo guardar. Comprueba tu sesión y la contraseña actual."
            : "Comprueba los datos. Para cambiar el correo, introduce tu contraseña actual.";
      return data<ProfileActionData>(
        { ok: false, message },
        { status: error.status, headers: error.headers },
      );
    }
  };
}
export const updateProfileAction = createUpdateProfileAction();
