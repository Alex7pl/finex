import { ArrowUpRightIcon } from "@phosphor-icons/react";
import { Orb, PaintTexture } from "@/components/art/Paint.js";
import { formatEuro } from "./chart-utils.js";

const savingsData = [
  { week: "S1", savings: 14 }, { week: "S2", savings: 17 }, { week: "S3", savings: 15 }, { week: "S4", savings: 19 },
  { week: "S5", savings: 18 }, { week: "S6", savings: 21 }, { week: "S7", savings: 20 }, { week: "S8", savings: 22 },
];

const maxSavings = 25;

/* Un arco con el orbe dentro: el único gesto pictórico de la tarjeta. */
function InsightArch() {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 140" className="pointer-events-none absolute right-6 top-6 h-[98px] w-[84px]">
      <defs><clipPath id="insight-arch"><path d="M10 140 V60 A50 50 0 0 1 110 60 V140 Z" /></clipPath></defs>
      <g clipPath="url(#insight-arch)">
        <rect width="120" height="140" fill="#e6dcc9" />
        <path d="M32 140 V64 A28 28 0 0 1 88 64 V140 Z" fill="url(#paint-sky)" />
        <rect x="32" y="122" width="56" height="18" fill="#94482a" />
        <Orb cx={60} cy={76} r={13} halo={false} />
        <PaintTexture width={120} height={140} />
      </g>
    </svg>
  );
}

export function InsightWidget() {
  return (
    <section className="relative flex h-full min-h-[360px] flex-col gap-3.5 overflow-hidden bg-ivory-soft p-7" aria-labelledby="insight-title">
      <InsightArch />
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-terracotta">Insight de FineX</p>
      <h2 id="insight-title" className="mt-14 max-w-[300px] font-serif text-[30px] font-normal leading-[1.08] tracking-[-0.01em] text-balance text-ink">Este mes puedes ahorrar <em className="italic">146&nbsp;€</em> sin cambiar tus hábitos.</h2>
      <p className="text-[13px] leading-relaxed text-pretty text-ink-muted">Tus suscripciones y recibos variables han bajado un 11%. Mueve la diferencia a tu fondo de emergencia.</p>
      <div className="mt-auto flex items-end justify-between gap-4">
        <button type="button" className="action-primary flex min-h-11 items-center gap-2 rounded-control px-3.5 text-[13px] font-semibold">Crear regla de ahorro <ArrowUpRightIcon size={14} aria-hidden="true" /></button>
        <ol className="flex h-10 items-end gap-[3px]" aria-label="Ahorro recuperable semanal, de 14 € a 22 €">
          {savingsData.map(({ week, savings }, index) => {
            const isLatest = index === savingsData.length - 1;
            return (
              <li
                key={week}
                title={`${week}: ${formatEuro(savings)}`}
                aria-label={`${week}: ${formatEuro(savings)}`}
                className={`w-2 ${isLatest ? "bg-terracotta" : "bg-petrol"}`}
                style={{ height: `${(savings / maxSavings) * 100}%`, opacity: isLatest ? 1 : 0.3 + index * 0.08 }}
              />
            );
          })}
        </ol>
      </div>
    </section>
  );
}
