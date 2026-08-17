import { DashboardPage } from "@/modules/dashboard/components/DashboardPage.js";

export function meta() {
  return [
    { title: "Resumen financiero | FineX" },
    {
      name: "description",
      content: "Tu dinero, presupuestos y objetivos en una sola vista.",
    },
  ];
}

export default function Dashboard() {
  return <DashboardPage />;
}
