import type { ReactNode } from "react";

const euroFormatter = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatEuro(value: number) {
  return euroFormatter.format(value);
}

export function formatCompactEuro(value: number) {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} mil €`;
  return `${value.toLocaleString("es-ES")} €`;
}

export function ChartTooltipRow({ label, value, marker }: { label: ReactNode; value: ReactNode; marker?: string }) {
  return (
    <div className="flex min-w-[150px] items-center justify-between gap-5">
      <span className="flex items-center gap-2 text-[#748078]">{marker ? <span className="size-2 rounded-[2px]" style={{ backgroundColor: marker }} /> : null}{label}</span>
      <strong className="font-mono font-semibold tabular-nums text-[#26332c]">{value}</strong>
    </div>
  );
}
