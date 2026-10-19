import { TrendUpIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart.js";
import { ChartTooltipRow, formatCompactEuro, formatEuro } from "./chart-utils.js";

type Period = "Semana" | "Mes" | "Año";
type BalancePoint = { date: string; balance: number };

const periods: Period[] = ["Semana", "Mes", "Año"];

const chartData: Record<Period, BalancePoint[]> = {
  Semana: [
    { date: "Lun", balance: 4514 }, { date: "Mar", balance: 4638 }, { date: "Mié", balance: 4582 },
    { date: "Jue", balance: 4726 }, { date: "Vie", balance: 4691 }, { date: "Sáb", balance: 4810 }, { date: "Dom", balance: 4892 },
  ],
  Mes: [
    { date: "1 ago", balance: 4210 }, { date: "3 ago", balance: 4380 }, { date: "5 ago", balance: 4315 },
    { date: "7 ago", balance: 4490 }, { date: "9 ago", balance: 4435 }, { date: "11 ago", balance: 4670 },
    { date: "13 ago", balance: 4590 }, { date: "15 ago", balance: 4780 }, { date: "17 ago", balance: 4615 },
    { date: "19 ago", balance: 4540 }, { date: "21 ago", balance: 4695 }, { date: "23 ago", balance: 4630 },
    { date: "25 ago", balance: 4795 }, { date: "27 ago", balance: 4960 }, { date: "29 ago", balance: 4892 },
  ],
  Año: [
    { date: "Sep", balance: 2860 }, { date: "Oct", balance: 3015 }, { date: "Nov", balance: 3280 },
    { date: "Dic", balance: 3120 }, { date: "Ene", balance: 3480 }, { date: "Feb", balance: 3610 },
    { date: "Mar", balance: 3890 }, { date: "Abr", balance: 4025 }, { date: "May", balance: 4170 },
    { date: "Jun", balance: 4390 }, { date: "Jul", balance: 4514 }, { date: "Ago", balance: 4892 },
  ],
};

const chartConfig = {
  balance: { label: "Saldo", color: "#ddbf8a" },
} satisfies ChartConfig;

/* El último punto del periodo es "hoy": un nodo de luz dorado que respira. */
function TodayDot({ cx, cy, index, length }: { cx?: number; cy?: number; index?: number; length: number }) {
  if (cx === undefined || cy === undefined || index !== length - 1) return <g />;
  return <rect className="fx-node" x={cx - 4} y={cy - 4} width={8} height={8} fill="#f4e4be" style={{ filter: "drop-shadow(0 0 6px rgba(244, 228, 190, 0.9))" }} />;
}

export function BalanceWidget() {
  const [range, setRange] = useState<Period>("Mes");
  const data = chartData[range];

  return (
    <section className="relative flex h-full min-h-[360px] flex-col gap-6 overflow-hidden bg-petrol-deep p-7 text-ivory" aria-labelledby="balance-title">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_85%_0%,rgba(221,191,138,0.16),rgba(221,191,138,0)_70%)]" />

      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold">Dinero disponible</p>
          <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
            <h2 id="balance-title" className="font-serif text-[60px] font-normal leading-[0.9] tracking-[-0.02em] lining-nums tabular-nums sm:text-[76px]">4.892,40 €</h2>
            <span className="flex items-center gap-1 bg-gold px-2 py-0.5 text-[13px] font-semibold text-petrol-deep"><TrendUpIcon size={14} aria-hidden="true" /> 8,4%</span>
          </div>
          <p className="text-sm text-[#b5bdb8]">+378,25 € respecto al mes pasado</p>
        </div>
        <div className="flex w-fit border border-ivory/20" role="group" aria-label="Periodo del gráfico">
          {periods.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setRange(item)}
              aria-pressed={range === item}
              className={`min-h-9 px-3.5 text-xs transition-[background-color,color] duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold ${range === item ? "bg-ivory font-semibold text-primary" : "font-medium text-[#b5bdb8] hover:text-ivory"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <ChartContainer config={chartConfig} className="relative mt-auto aspect-auto h-[190px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-[#8e9a96] [&_.recharts-cartesian-axis-tick_text]:font-mono [&_.recharts-cartesian-axis-tick_text]:text-[10px]" aria-label={`Evolución del saldo durante el periodo: ${range}`}>
        <AreaChart accessibilityLayer data={data} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ddbf8a" stopOpacity={0.24} />
              <stop offset="1" stopColor="#ddbf8a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="2 6" stroke="rgba(241,233,218,0.1)" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} width={54} tickFormatter={formatCompactEuro} domain={["dataMin - 200", "dataMax + 150"]} />
          <ChartTooltip cursor={{ stroke: "rgba(241,233,218,0.25)" }} content={<ChartTooltipContent indicator="line" labelKey="date" formatter={(value) => <ChartTooltipRow label="Saldo" value={formatEuro(Number(value))} marker="#b38a4e" />} />} />
          <Area
            dataKey="balance"
            type="monotone"
            fill="url(#balance-fill)"
            stroke="var(--color-balance)"
            strokeWidth={1.8}
            dot={(props: { cx?: number; cy?: number; index?: number }) => <TodayDot key={`dot-${props.index}`} {...props} length={data.length} />}
            activeDot={{ r: 4, fill: "#f4e4be", stroke: "#15313a", strokeWidth: 2 }}
          />
        </AreaChart>
      </ChartContainer>
    </section>
  );
}
