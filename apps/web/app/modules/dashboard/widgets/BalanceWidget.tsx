import { Link } from "react-router";
import type { DashboardWidgetProps } from "../dashboard.types.js";
import { cents, decimal, formatMoney } from "../dashboard-money.js";
import { dashboardHref } from "../dashboard-period.js";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart.js";
import {
  ChartTooltipRow,
  formatCompactEuro,
  formatEuro,
} from "./chart-utils.js";

const chartConfig = {
  balance: { label: "Saldo", color: "#ddbf8a" },
} satisfies ChartConfig;

/* El último punto del periodo es "hoy": un nodo de luz dorado que respira. */
function TodayDot({
  cx,
  cy,
  index,
  length,
}: {
  cx?: number;
  cy?: number;
  index?: number;
  length: number;
}) {
  if (cx === undefined || cy === undefined || index !== length - 1)
    return <g />;
  return (
    <rect
      className="fx-node"
      x={cx - 4}
      y={cy - 4}
      width={8}
      height={8}
      fill="#f4e4be"
      style={{ filter: "drop-shadow(0 0 6px rgba(244, 228, 190, 0.9))" }}
    />
  );
}

export function BalanceWidget({
  dashboard: { balance, filters },
}: DashboardWidgetProps) {
  const range = filters.range;
  const data = balance.history.map((point) => ({
    date: new Intl.DateTimeFormat("es-ES", {
      day: range === "year" ? undefined : "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${point.date}T12:00:00Z`)),
    balance: Number(point.acumulated_balance),
  }));
  const difference =
    cents(balance.total_balance) - cents(balance.initial_balance);

  return (
    <section
      className="relative flex h-full min-h-[360px] flex-col gap-6 overflow-hidden bg-petrol-deep p-7 text-ivory"
      aria-labelledby="balance-title"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_85%_0%,rgba(221,191,138,0.16),rgba(221,191,138,0)_70%)]"
      />

      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold">
            Saldo del periodo
          </p>
          <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-2">
            <h2
              id="balance-title"
              className="font-serif text-[60px] font-normal leading-[0.9] tracking-[-0.02em] lining-nums tabular-nums sm:text-[76px]"
            >
              {formatMoney(balance.total_balance)}
            </h2>
          </div>
          <p className="text-sm text-[#b5bdb8]">
            {difference > 0n ? "+" : ""}
            {formatMoney(decimal(difference))} desde el inicio del periodo
          </p>
        </div>
        <div
          className="flex w-fit border border-ivory/20"
          role="group"
          aria-label="Periodo del gráfico"
        >
          {(
            [
              ["week", "Semana"],
              ["month", "Mes"],
              ["year", "Año"],
            ] as const
          ).map(([item, label]) => (
            <Link
              key={item}
              to={dashboardHref(filters, { range: item })}
              preventScrollReset
              aria-current={range === item ? "true" : undefined}
              className={`flex min-h-9 items-center px-3.5 text-xs transition-[background-color,color] duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold ${range === item ? "bg-ivory font-semibold text-primary" : "font-medium text-[#b5bdb8] hover:text-ivory"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <ChartContainer
        config={chartConfig}
        className="relative mt-auto aspect-auto h-[190px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-[#8e9a96] [&_.recharts-cartesian-axis-tick_text]:font-mono [&_.recharts-cartesian-axis-tick_text]:text-[10px]"
        aria-label={`Evolución del saldo durante el periodo: ${range}`}
      >
        <AreaChart
          accessibilityLayer
          data={data}
          margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
        >
          <defs>
            <linearGradient id="balance-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ddbf8a" stopOpacity={0.24} />
              <stop offset="1" stopColor="#ddbf8a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            strokeDasharray="2 6"
            stroke="rgba(241,233,218,0.1)"
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={formatCompactEuro}
            domain={["dataMin - 200", "dataMax + 150"]}
          />
          <ChartTooltip
            cursor={{ stroke: "rgba(241,233,218,0.25)" }}
            content={
              <ChartTooltipContent
                indicator="line"
                labelKey="date"
                formatter={(value) => (
                  <ChartTooltipRow
                    label="Saldo"
                    value={formatEuro(Number(value))}
                    marker="#b38a4e"
                  />
                )}
              />
            }
          />
          <Area
            dataKey="balance"
            type="monotone"
            fill="url(#balance-fill)"
            stroke="var(--color-balance)"
            strokeWidth={1.8}
            dot={(props: { cx?: number; cy?: number; index?: number }) => (
              <TodayDot
                key={`dot-${props.index}`}
                {...props}
                length={data.length}
              />
            )}
            activeDot={{
              r: 4,
              fill: "#f4e4be",
              stroke: "#15313a",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ChartContainer>
    </section>
  );
}
