import { ArrowUpRight, Sparkles } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart.js";
import { ChartTooltipRow, formatEuro } from "./chart-utils.js";

const savingsData = [
  { week: "S1", savings: 14 }, { week: "S2", savings: 17 }, { week: "S3", savings: 15 }, { week: "S4", savings: 19 },
  { week: "S5", savings: 18 }, { week: "S6", savings: 21 }, { week: "S7", savings: 20 }, { week: "S8", savings: 22 },
];

const chartConfig = {
  savings: { label: "Ahorro recuperable", color: "#6f956c" },
} satisfies ChartConfig;

export function InsightWidget() {
  return (
    <section className="flex h-full min-h-[310px] flex-col overflow-hidden rounded-[12px] border border-[#dce6db] bg-[#eff5ec]" aria-labelledby="insight-title">
      <div className="flex-1 p-5 sm:p-6">
        <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#3d6d4f]"><Sparkles size={15} /> Insight de finex</div>
        <h2 id="insight-title" className="mt-4 max-w-sm text-[20px] font-semibold leading-[1.2] tracking-[-0.03em] text-[#1d3b2b]">Este mes puedes ahorrar 146 € sin cambiar tus hábitos.</h2>
        <p className="mt-3 text-[13px] leading-5 text-[#65756a]">Tus suscripciones y recibos variables han bajado un 11%. Mueve la diferencia a tu fondo de emergencia.</p>
        <button type="button" className="action-primary mt-5 flex items-center gap-2 rounded-control px-4 py-2.5 text-[12px] font-semibold">Crear regla de ahorro <ArrowUpRight size={15} /></button>
      </div>
      <div className="border-t border-[#dce6db] bg-white/55 px-4 pb-3 pt-3 sm:px-5">
        <p className="px-1 text-[10px] font-medium uppercase tracking-[0.07em] text-[#738278]">Ahorro recuperable · últimas 8 semanas</p>
        <ChartContainer config={chartConfig} className="mt-1 h-[86px] w-full aspect-auto" aria-label="Ahorro recuperable durante las últimas ocho semanas">
          <BarChart accessibilityLayer data={savingsData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={5} fontSize={9} />
            <YAxis hide domain={[0, 25]} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value) => <ChartTooltipRow label="Ahorro" value={formatEuro(Number(value))} marker="#6f956c" />} />} />
            <Bar dataKey="savings" fill="var(--color-savings)" radius={[3, 3, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ChartContainer>
      </div>
    </section>
  );
}
