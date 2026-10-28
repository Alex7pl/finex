import { useId } from "react";
import { PaintTexture } from "@/components/art/Paint.js";

import type { DashboardWidgetProps } from "../dashboard.types.js";
import { formatMoney } from "../dashboard-money.js";

/* El objetivo es el orbe de la portada, que se llena de oro hasta lo ahorrado. */
function GoalOrb({ percent, name }: { percent: number; name: string }) {
  const clipId = `goal-orb-${useId().replace(/:/g, "")}`;
  const top = 6;
  const base = 106;
  const level =
    base - ((base - top) * Math.max(0, Math.min(100, percent))) / 100;

  return (
    <svg
      role="img"
      aria-label={`${name}: ${percent}% completado`}
      width="112"
      height="112"
      viewBox="0 0 112 112"
      className="shrink-0"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="56" cy="56" r="50" />
        </clipPath>
      </defs>
      <circle cx="56" cy="56" r="50" fill="#e3d6bc" />
      <g clipPath={`url(#${clipId})`}>
        <rect
          x="0"
          y={level}
          width="112"
          height={112 - level}
          fill="url(#paint-orb)"
        />
        <rect
          x="0"
          y={level}
          width="112"
          height={112 - level}
          fill="#808080"
          filter="url(#paint-patina)"
          opacity={0.3}
          style={{ mixBlendMode: "soft-light" }}
        />
        <rect x="0" y={level - 1} width="112" height="1.5" fill="#fff1cf" />
        <PaintTexture width={112} height={112} />
      </g>
      <circle
        cx="56"
        cy="56"
        r="50"
        fill="none"
        stroke="#b38a4e"
        strokeOpacity={0.6}
      />
      <path
        d="M36 22 A40 40 0 0 1 70 14"
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.7}
        strokeWidth={1.5}
      />
    </svg>
  );
}

export function GoalWidget({ dashboard: { goals } }: DashboardWidgetProps) {
  return (
    <section
      id="objetivos"
      className="flex h-full min-h-[300px] flex-col gap-5 bg-parchment p-7"
      aria-labelledby="goal-title"
    >
      <h2 id="goal-title" className="text-[15px] font-semibold text-ink">
        Objetivos de ahorro
      </h2>
      {goals.length === 0 ? (
        <p className="my-auto text-sm text-ink-muted">
          Aún no tienes objetivos de ahorro.
        </p>
      ) : (
        goals.map((goal) => (
          <div
            key={goal.id}
            className="flex flex-col gap-4 border-b border-stone-line pb-5 last:border-0 last:pb-0"
          >
            <h3 className="text-sm font-semibold">{goal.name ?? "Objetivo"}</h3>
            <div className="flex items-center gap-5">
              <GoalOrb
                percent={goal.progress_percent}
                name={goal.name ?? "Objetivo"}
              />
              <div className="flex min-w-0 flex-col gap-1">
                <strong className="font-serif text-[32px] lining-nums tabular-nums">
                  {formatMoney(goal.current_amount)}
                </strong>
                <span className="text-xs text-ink-muted">
                  de {formatMoney(goal.target_amount)} · {goal.progress_percent}
                  %
                </span>
                <span className="text-xs font-medium text-petrol">
                  {goal.completed
                    ? "Objetivo completado"
                    : `Faltan ${formatMoney(goal.remaining)}`}
                </span>
              </div>
            </div>
          </div>
        ))
      )}
      <p className="mt-auto text-xs text-ink-muted">
        Progreso registrado de tus objetivos.
      </p>
    </section>
  );
}
