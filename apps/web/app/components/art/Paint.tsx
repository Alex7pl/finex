/* Recursos pictóricos compartidos por las escenas de El hilo: cielo, llanura,
   orbe de oro mate, nubes pintadas y texturas de pigmento. <PaintDefs /> se
   monta una vez por página; el resto de escenas lo referencia por id. */

const grey = { slope: 1.9, intercept: -0.45 };

function NeutralNoise({ frequency, octaves, seed, slope = grey.slope, intercept = grey.intercept }: { frequency: string; octaves: number; seed: number; slope?: number; intercept?: number }) {
  return (
    <>
      <feTurbulence type="fractalNoise" baseFrequency={frequency} numOctaves={octaves} seed={seed} stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer>
        <feFuncR type="linear" slope={slope} intercept={intercept} />
        <feFuncG type="linear" slope={slope} intercept={intercept} />
        <feFuncB type="linear" slope={slope} intercept={intercept} />
        <feFuncA type="linear" slope={0} intercept={1} />
      </feComponentTransfer>
      <feComposite in2="SourceGraphic" operator="in" />
    </>
  );
}

export function PaintDefs() {
  return (
    <svg aria-hidden="true" width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="paint-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0a151b" />
          <stop offset="0.38" stopColor="#15323b" />
          <stop offset="0.66" stopColor="#2f5157" />
          <stop offset="0.8" stopColor="#8c8269" />
          <stop offset="0.88" stopColor="#c9a47a" />
          <stop offset="1" stopColor="#c9a47a" />
        </linearGradient>
        <linearGradient id="paint-plain" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b8683b" />
          <stop offset="0.35" stopColor="#94482a" />
          <stop offset="1" stopColor="#4a2216" />
        </linearGradient>
        <linearGradient id="paint-wall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e3cfa9" />
          <stop offset="0.6" stopColor="#c9ae84" />
          <stop offset="1" stopColor="#9c8160" />
        </linearGradient>
        <radialGradient id="paint-orb" cx="34%" cy="28%" r="78%">
          <stop offset="0" stopColor="#f4e4be" />
          <stop offset="0.28" stopColor="#d7b67c" />
          <stop offset="0.62" stopColor="#8f6c40" />
          <stop offset="0.9" stopColor="#3a2b1c" />
          <stop offset="1" stopColor="#241a12" />
        </radialGradient>
        <radialGradient id="paint-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0.45" stopColor="#f4e4be" stopOpacity="0.3" />
          <stop offset="1" stopColor="#f4e4be" stopOpacity="0" />
        </radialGradient>
        <filter id="paint-cloud" x="-40%" y="-80%" width="180%" height="260%">
          <feTurbulence type="fractalNoise" baseFrequency="0.014 0.035" numOctaves={4} seed={9} result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={24} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation="0.8" />
        </filter>
        <filter id="paint-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="g" />
          <feMerge>
            <feMergeNode in="g" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="paint-grain" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <NeutralNoise frequency="0.82" octaves={3} seed={4} />
        </filter>
        <filter id="paint-mottle" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <NeutralNoise frequency="0.012 0.03" octaves={5} seed={5} slope={1.8} intercept={-0.4} />
        </filter>
        <filter id="paint-patina" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <NeutralNoise frequency="0.035" octaves={4} seed={14} slope={1.8} intercept={-0.4} />
        </filter>
      </defs>
    </svg>
  );
}

/* Capa de pigmento y grano encima de una escena: sutil, nunca ruido. */
export function PaintTexture({ width, height }: { width: number; height: number }) {
  return (
    <g aria-hidden="true">
      <rect width={width} height={height} fill="#808080" filter="url(#paint-mottle)" opacity={0.18} style={{ mixBlendMode: "soft-light" }} />
      <rect width={width} height={height} fill="#808080" filter="url(#paint-grain)" opacity={0.14} style={{ mixBlendMode: "overlay" }} />
    </g>
  );
}

/* Orbe de oro mate con halo y pátina. */
export function Orb({ cx, cy, r, halo = true }: { cx: number; cy: number; r: number; halo?: boolean }) {
  return (
    <g>
      {halo ? <circle cx={cx} cy={cy} r={r * 2.2} fill="url(#paint-halo)" /> : null}
      <circle cx={cx} cy={cy} r={r} fill="url(#paint-orb)" />
      <circle cx={cx} cy={cy} r={r} fill="#808080" filter="url(#paint-patina)" opacity={0.35} style={{ mixBlendMode: "soft-light" }} />
    </g>
  );
}

/* Figura diminuta de pie, con su sombra larga hacia la derecha. */
export function Figure({ x, y, color = "#1a120d", shadow = 100 }: { x: number; y: number; color?: string; shadow?: number }) {
  return (
    <g>
      <path d={`M${x} ${y} L${x + shadow} ${y + shadow * 0.12} L${x + shadow + 2} ${y + shadow * 0.12 - 4} L${x + 4} ${y - 2} Z`} fill="#2b140c" opacity={0.45} />
      <circle cx={x} cy={y - 26} r={4.2} fill={color} />
      <path d={`M${x - 5} ${y - 20} L${x + 5} ${y - 20} L${x + 7} ${y} L${x - 7} ${y} Z`} fill={color} />
    </g>
  );
}
