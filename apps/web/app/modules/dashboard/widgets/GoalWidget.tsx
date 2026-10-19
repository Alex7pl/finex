import { TimerIcon } from "@phosphor-icons/react";
import { useId } from "react";
import { PaintTexture } from "@/components/art/Paint.js";

const saved = 2150;
const target = 6000;
const percent = Math.round((saved / target) * 100);

/* El objetivo es el orbe de la portada, que se llena de oro hasta lo ahorrado. */
function GoalOrb() {
  const clipId = `goal-orb-${useId().replace(/:/g, "")}`;
  const top = 6;
  const base = 106;
  const level = base - ((base - top) * percent) / 100;

  return (
    <svg role="img" aria-label={`Fondo de emergencia: ${percent}% completado`} width="112" height="112" viewBox="0 0 112 112" className="shrink-0">
      <defs><clipPath id={clipId}><circle cx="56" cy="56" r="50" /></clipPath></defs>
      <circle cx="56" cy="56" r="50" fill="#e3d6bc" />
      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y={level} width="112" height={112 - level} fill="url(#paint-orb)" />
        <rect x="0" y={level} width="112" height={112 - level} fill="#808080" filter="url(#paint-patina)" opacity={0.3} style={{ mixBlendMode: "soft-light" }} />
        <rect x="0" y={level - 1} width="112" height="1.5" fill="#fff1cf" />
        <PaintTexture width={112} height={112} />
      </g>
      <circle cx="56" cy="56" r="50" fill="none" stroke="#b38a4e" strokeOpacity={0.6} />
      <path d="M36 22 A40 40 0 0 1 70 14" fill="none" stroke="#ffffff" strokeOpacity={0.7} strokeWidth={1.5} />
    </svg>
  );
}

export function GoalWidget() {
  return (
    <section className="flex h-full min-h-[300px] flex-col gap-4 bg-parchment p-7" aria-labelledby="goal-title">
      <div className="flex flex-col gap-1.5">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold-ink">Próximo objetivo</p>
        <h2 id="goal-title" className="text-[15px] font-semibold text-ink">Fondo de emergencia</h2>
      </div>
      <div className="mt-auto flex items-end gap-5">
        <GoalOrb />
        <div className="flex min-w-0 flex-col gap-1">
          <strong className="font-serif text-[44px] font-normal leading-none lining-nums tabular-nums text-ink">2.150 €</strong>
          <span className="text-xs tabular-nums text-[#5c4a2c]">de 6.000 € · {percent}%</span>
          <span className="flex items-center gap-1 text-xs font-medium text-petrol"><TimerIcon size={14} aria-hidden="true" /> 7 meses al ritmo actual</span>
        </div>
      </div>
    </section>
  );
}
