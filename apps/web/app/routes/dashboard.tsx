import { data } from "react-router";
import type { Route } from "./+types/dashboard";
import { routeAction, routeHandler } from "@/libs/route-handler.server.js";
import { DashboardPage } from "@/modules/dashboard/components/DashboardPage.js";
import { loadDashboard } from "@/modules/dashboard/dashboard.api.server.js";
import { updateProfileAction } from "@/modules/users/users.action.server.js";

export const loader = routeHandler(async ({ request }: Route.LoaderArgs) => {
  const result = await loadDashboard(request);
  return data(result.data, { headers: result.headers });
});
export const action = routeAction(({ request }: Route.ActionArgs) =>
  updateProfileAction(request),
);
export function meta() {
  return [
    { title: "Resumen financiero | FineX" },
    {
      name: "description",
      content: "Tu dinero, presupuestos y objetivos en una sola vista.",
    },
  ];
}
export function headers({ loaderHeaders, actionHeaders }: Route.HeadersArgs) {
  const headers = new Headers({ "Cache-Control": "private, no-store" });
  for (const source of [loaderHeaders, actionHeaders])
    for (const cookie of source.getSetCookie())
      headers.append("set-cookie", cookie);
  return headers;
}
export default function Dashboard({ loaderData }: Route.ComponentProps) {
  return <DashboardPage dashboard={loaderData} />;
}
