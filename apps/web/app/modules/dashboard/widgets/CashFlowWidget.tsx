import { ArrowDownLeft, ArrowUpRight, MoreHorizontal } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart.js";
import { ChartTooltipRow, formatEuro } from "./chart-utils.js";

const cashFlowData = [{ period: "Agosto", expenses: 1913.28, available: 1326.72 }];
const chartConfig = {
  expenses: { label: "Gastado", color: "#d9a45f" },
  available: { label: "Disponible", color: "#b9df95" },
} satisfies ChartConfig;

export function CashFlowWidget() {
  return (
    <section className="h-full min-h-[270px] rounded-[12px] border border-[#e4e7e1] bg-[#183d2d] p-5 text-white sm:p-6" aria-labelledby="cash-flow-title">
      <div className="flex items-center justify-between">
        <p id="cash-flow-title" className="text-[13px] font-medium text-[#c1d2c8]">Balance de agosto</p>
        <button type="button" aria-label="Más opciones de balance"><MoreHorizontal size={19} className="text-[#b8c9bf]" /></button>
      </div>
      <p className="mt-3 text-[28px] font-semibold tracking-[-0.04em]">+1.326,72 €</p>
      <ChartContainer config={chartConfig} className="mt-5 h-[34px] w-full aspect-auto" aria-label="Composición de los ingresos de agosto entre gastos y dinero disponible">
        <BarChart accessibilityLayer data={cashFlowData} layout="vertical" margin={{ left: 0, right: 0, top: 8, bottom: 8 }}>
          <XAxis type="number" hide domain={[0, 3240]} />
          <YAxis type="category" dataKey="period" hide />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value, name) => <ChartTooltipRow label={name === "expenses" ? "Gastado" : "Disponible"} value={formatEuro(Number(value))} marker={name === "expenses" ? "#d9a45f" : "#b9df95"} />} />} />
          <Bar dataKey="expenses" stackId="cash" fill="var(--color-expenses)" radius={[5, 0, 0, 5]} />
          <Bar dataKey="available" stackId="cash" fill="var(--color-available)" radius={[0, 5, 5, 0]} />
        </BarChart>
      </ChartContainer>
      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5">
        <div><span className="flex items-center gap-1.5 text-[12px] text-[#b9cac0]"><ArrowDownLeft size={14} /> Ingresos</span><strong className="mt-1.5 block text-[16px] font-semibold">3.240,00 €</strong></div>
        <div><span className="flex items-center gap-1.5 text-[12px] text-[#b9cac0]"><ArrowUpRight size={14} /> Gastos</span><strong className="mt-1.5 block text-[16px] font-semibold">1.913,28 €</strong></div>
      </div>
    </section>
  );
}
