import { Home, TimerReset } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart.js";
import { ChartTooltipRow } from "./chart-utils.js";

const goalData = [{ name: "Fondo", completed: 36, remaining: 64 }];
const chartConfig = {
  completed: { label: "Completado", color: "#6e9a65" },
  remaining: { label: "Pendiente", color: "#e7ebe5" },
} satisfies ChartConfig;

export function GoalWidget() {
  return (
    <section className="h-full min-h-[240px] rounded-[12px] border border-[#e4e7e1] bg-white p-5 sm:p-6" aria-labelledby="goal-title">
      <div className="flex items-center justify-between"><div><p className="text-[12px] font-medium text-[#858d88]">Próximo objetivo</p><h2 id="goal-title" className="mt-1 text-[16px] font-semibold text-[#2e3933]">Fondo de emergencia</h2></div><div className="grid size-10 place-items-center rounded-[9px] bg-[#eef2e9] text-[#426844]"><Home size={18} /></div></div>
      <div className="mt-7 flex items-end justify-between"><strong className="text-[22px] tracking-[-0.03em] text-[#29352f]">2.150 €</strong><span className="text-[12px] text-[#8d9490]">de 6.000 €</span></div>
      <ChartContainer config={chartConfig} className="mt-3 h-[32px] w-full aspect-auto" aria-label="Progreso del fondo de emergencia: 36 por ciento completado">
        <BarChart accessibilityLayer data={goalData} layout="vertical" margin={{ left: 0, right: 0, top: 8, bottom: 8 }}>
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis type="category" dataKey="name" hide />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value, name) => <ChartTooltipRow label={name === "completed" ? "Completado" : "Pendiente"} value={`${Number(value)}%`} marker={name === "completed" ? "#6e9a65" : "#dfe5dd"} />} />} />
          <Bar dataKey="completed" stackId="goal" fill="var(--color-completed)" radius={[5, 0, 0, 5]} />
          <Bar dataKey="remaining" stackId="goal" fill="var(--color-remaining)" radius={[0, 5, 5, 0]} />
        </BarChart>
      </ChartContainer>
      <div className="mt-3 flex items-center justify-between text-[11px] text-[#8b928e]"><span>36% completado</span><span className="flex items-center gap-1 text-[#447050]"><TimerReset size={13} /> 7 meses</span></div>
    </section>
  );
}
