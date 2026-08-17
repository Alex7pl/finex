import { TrendingUp } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart.js";
import { ChartTooltipRow, formatCompactEuro, formatEuro } from "./chart-utils.js";

type Period = "Semana" | "Mes" | "Año";
type BalancePoint = { date: string; balance: number };

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
  balance: { label: "Saldo", color: "#1f5a40" },
} satisfies ChartConfig;

export function BalanceWidget() {
  const [range, setRange] = useState<Period>("Mes");

  return (
    <section className="h-full min-h-[310px] rounded-[12px] border border-[#e4e7e1] bg-white p-5 shadow-[0_1px_2px_rgba(24,52,43,0.02)] sm:p-7" aria-labelledby="balance-title">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <p className="text-[13px] font-medium text-[#7c847f]">Dinero disponible</p>
          <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-2">
            <h2 id="balance-title" className="text-[34px] font-semibold leading-none tracking-[-0.045em] text-[#1d2923] sm:text-[42px]">4.892,40 €</h2>
            <span className="flex items-center gap-1 text-[13px] font-semibold text-[#2f7957]"><TrendingUp size={15} /> 8,4%</span>
          </div>
          <p className="mt-3 text-[13px] text-[#8a918d]">+378,25 € respecto al mes pasado</p>
        </div>
        <div className="flex w-fit rounded-[7px] bg-[#f0f2ee] p-1" aria-label="Periodo del gráfico">
          {["Semana", "Mes", "Año"].map((item) => (
            <button key={item} type="button" onClick={() => setRange(item as Period)} className={`rounded-[5px] px-3 py-1.5 text-[12px] font-medium transition-colors ${range === item ? "bg-white text-[#1d3329] shadow-sm" : "text-[#7a827d] hover:text-[#314139]"}`}>{item}</button>
          ))}
        </div>
      </div>
      <ChartContainer config={chartConfig} className="mt-7 h-[190px] w-full aspect-auto" aria-label={`Evolución del saldo durante el periodo: ${range}`}>
        <AreaChart accessibilityLayer data={chartData[range]} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} width={54} tickFormatter={formatCompactEuro} domain={["dataMin - 200", "dataMax + 150"]} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" labelKey="date" formatter={(value) => <ChartTooltipRow label="Saldo" value={formatEuro(Number(value))} marker="#1f5a40" />} />} />
          <Area dataKey="balance" type="monotone" fill="var(--color-balance)" fillOpacity={0.14} stroke="var(--color-balance)" strokeWidth={2} activeDot={{ r: 4, fill: "#1f5a40", stroke: "#ffffff", strokeWidth: 2 }} />
        </AreaChart>
      </ChartContainer>
      <p className="mt-1 text-right text-[10px] text-[#9aa19d]">Escala ajustada al saldo del periodo</p>
    </section>
  );
}
