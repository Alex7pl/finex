import { useEffect } from "react";
import { useFetcher } from "react-router";
import type { UserProfile } from "@finex/shared/users/users.schema.js";
import type { ProfileActionData } from "../dashboard.types.js";
import { notify } from "@/libs/notifications.js";
import { DashboardDialog } from "./DashboardDialog.js";

export function ProfileDialog({
  user,
  onClose,
}: {
  user: UserProfile;
  onClose: () => void;
}) {
  const fetcher = useFetcher<ProfileActionData>();
  const pending = fetcher.state !== "idle";
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      notify.success("Perfil actualizado.");
      onClose();
    }
  }, [fetcher.state, fetcher.data, onClose]);
  return (
    <DashboardDialog title="Tu perfil" onClose={onClose}>
      <p className="mb-5 text-sm text-ink-muted">
        Miembro desde{" "}
        {new Intl.DateTimeFormat("es-ES", {
          dateStyle: "long",
          timeZone: "Europe/Madrid",
        }).format(new Date(user.created_at))}
      </p>
      <fetcher.Form
        method="post"
        action="/dashboard"
        className="flex flex-col gap-4"
      >
        <input type="hidden" name="intent" value="update-profile" />
        <label className="flex flex-col gap-2 text-sm">
          Nombre de usuario
          <input
            name="username"
            defaultValue={user.username}
            required
            minLength={2}
            maxLength={40}
            autoComplete="username"
            className="field p-3"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Correo electrónico
          <input
            name="email"
            type="email"
            defaultValue={user.email}
            required
            maxLength={254}
            autoComplete="email"
            className="field p-3"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm">
          Contraseña actual
          <input
            name="current_password"
            type="password"
            autoComplete="current-password"
            maxLength={1024}
            className="field p-3"
            aria-describedby="password-help"
          />
        </label>
        <p id="password-help" className="text-xs text-ink-muted">
          Necesaria solo si cambias el correo de acceso.
        </p>
        {fetcher.data && !fetcher.data.ok ? (
          <p role="alert" className="text-sm text-danger">
            {fetcher.data.message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="action-primary mt-2 min-h-11 p-3 font-semibold disabled:opacity-50"
        >
          {pending ? "Guardando…" : "Guardar perfil"}
        </button>
      </fetcher.Form>
    </DashboardDialog>
  );
}
