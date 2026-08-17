import { ChevronRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart.js";
import { ChartTooltipRow, formatEuro } from "./chart-utils.js";

const budgets = [
  { name: "Alimentación", spent: 326, total: 450, percent: 72 },
  { name: "Restaurantes", spent: 184, total: 220, percent: 84 },
  { name: "Transporte", spent: 96, total: 180, percent: 53 },
];

const chartConfig = {
  percent: { label: "Consumido", color: "#557f64" },
} satisfies ChartConfig;

export function BudgetsWidget() {
  return (
    <section className="h-full min-h-[270px] rounded-[12px] border border-[#e4e7e1] bg-white p-5 sm:p-6" aria-labelledby="budget-title">
      <div className="flex items-center justify-between">
        <div><h2 id="budget-title" className="text-[17px] font-semibold tracking-[-0.02em] text-[#26322c]">Presupuestos</h2><p className="mt-1 text-[12px] text-[#8a918d]">Agosto · 19 días restantes</p></div>
        <a href="#presupuestos" className="flex items-center gap-1 text-[12px] font-semibold text-[#286649]">Ver todos <ChevronRight size={14} /></a>
      </div>
      <ChartContainer config={chartConfig} className="mt-5 h-[168px] w-full aspect-auto" aria-label="Porcentaje consumido de cada presupuesto mensual">
        <BarChart accessibilityLayer data={budgets} layout="vertical" margin={{ left: 0, right: 34, top: 2, bottom: 2 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
          <XAxis type="number" hide domain={[0, 100]} />
          <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={84} fontSize={10} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value, _name, item) => {
            const row = item.payload as (typeof budgets)[number];
            return <ChartTooltipRow label={`${formatEuro(row.spent)} de ${formatEuro(row.total)}`} value={`${Number(value)}%`} marker="#557f64" />;
          }} />} />
          <Bar dataKey="percent" fill="var(--color-percent)" radius={[0, 4, 4, 0]} barSize={17}>
            <LabelList dataKey="percent" position="right" formatter={(value) => `${Number(value)}%`} className="fill-[#536159] text-[10px] font-semibold" />
          </Bar>
        </BarChart>
      </ChartContainer>
    </section>
  );
}
