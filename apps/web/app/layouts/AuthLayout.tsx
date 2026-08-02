import { routeHandler } from "@/libs/route-handler.server";
import { authApi } from "@/modules/auth/auth.api.server";
import { data, redirect } from "react-router";
import type { Route } from "./+types/AuthLayout";

export const loader = routeHandler(async ({ request }: Route.LoaderArgs) => {
  const result = await authApi.verifyLogin(request);

  if (!result.data) {
    return redirect("/", { headers: result.headers });
  }

  return data({ authenticated: result.data }, { headers: result.headers });
});

export function meta({ loaderData }: Route.ComponentProps) {
  const { authenticated } = loaderData;

  console.log("AuthLayout meta loaderData:", loaderData);
  return [
    { title: "FineX" },
    ...(authenticated ? [{ rel: "canonical", href: "/" }] : []),
  ];
}
