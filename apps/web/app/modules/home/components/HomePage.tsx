import { ArrowRightIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Figure, Orb, PaintDefs, PaintTexture } from "@/components/art/Paint.js";

const HERO_VIDEO = "/landing-video.mp4";
const HERO_POSTER = "/landing-video-poster.jpg";
const TAGLINE = "Convierte tus datos en decisiones claras, precisas y accionables.".split(" ");

interface HomePageProps {
  userAuthenticated: boolean;
  authOpen: boolean;
  authPanel?: ReactNode;
  onLogin: (trigger: HTMLButtonElement) => void;
  onRegister: (trigger: HTMLButtonElement) => void;
}

type CtaProps = Pick<HomePageProps, "userAuthenticated" | "onRegister"> & { tone: "gold" | "primary"; className?: string };

/* La acción principal de la página, repetida en cada sección. */
function PrimaryCta({ userAuthenticated, onRegister, tone, className = "" }: CtaProps) {
  const classes = `${tone === "gold" ? "action-gold" : "action-primary"} inline-flex min-h-12 w-max items-center gap-3 rounded-control px-6 text-base font-semibold ${className}`;
  if (userAuthenticated) {
    return (
      <a href="/dashboard" className={classes}>
        Ir a mi panel
        <ArrowRightIcon size={18} aria-hidden="true" />
      </a>
    );
  }
  return (
    <button type="button" onClick={(event) => onRegister(event.currentTarget)} className={classes}>
      Crear mi cuenta
      <ArrowRightIcon size={18} aria-hidden="true" />
    </button>
  );
}

/* Con movimiento reducido el vídeo se queda quieto en su primer fotograma. */
function useStillVideo(video: RefObject<HTMLVideoElement | null>) {
  useEffect(() => {
    const element = video.current;
    if (!element || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (query.matches) element.pause();
      else void element.play().catch(() => {});
    };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [video]);
}

function HomeHeader({ userAuthenticated, onLogin, onRegister }: Pick<HomePageProps, "userAuthenticated" | "onLogin" | "onRegister">) {
  return (
    <header className="fx-in flex flex-wrap items-center justify-between gap-4">
      <a href="/" className="font-serif text-[32px] font-medium tracking-[-0.01em] text-ivory" aria-label="FineX home">
        FineX
      </a>
      <nav aria-label="Principal" className="flex items-center gap-2">
        {userAuthenticated ? (
          <a href="/dashboard" className="action-gold inline-flex min-h-11 items-center rounded-control px-4 text-sm font-semibold">
            Ir al panel
          </a>
        ) : (
          <>
            <button type="button" onClick={(event) => onLogin(event.currentTarget)} className="action-ghost-light min-h-11 rounded-control px-4 text-sm font-medium">
              Iniciar sesión
            </button>
            <button type="button" onClick={(event) => onRegister(event.currentTarget)} className="min-h-11 rounded-control bg-ivory px-4 text-sm font-semibold text-primary transition-colors duration-500 hover:bg-gold">
              Registrarse
            </button>
          </>
        )}
      </nav>
    </header>
  );
}

function Hero({ authOpen, authPanel, userAuthenticated, onLogin, onRegister }: HomePageProps) {
  const video = useRef<HTMLVideoElement>(null);
  useStillVideo(video);

  return (
    <section aria-label="Portada" className="relative isolate flex min-h-[max(680px,100svh)] flex-col overflow-hidden bg-night text-ivory">
      <video
        ref={video}
        src={HERO_VIDEO}
        poster={HERO_POSTER}
        className="fx-zoom absolute inset-0 -z-10 h-full w-full object-cover object-[62%_center]"
        autoPlay
        muted
        loop
        playsInline
        aria-label="Escena pintada: una figura en la llanura sostiene el hilo de un orbe dorado"
      />
      <div aria-hidden="true" className="hero-scrim absolute inset-0 -z-10" />

      {authPanel}

      <div className="relative z-10 px-5 pt-7 md:px-12 lg:px-24">
        <HomeHeader userAuthenticated={userAuthenticated} onLogin={onLogin} onRegister={onRegister} />
      </div>

      <div className={`relative z-10 flex flex-1 flex-col px-5 pb-9 pt-16 transition-[transform,filter,opacity] duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] md:px-12 md:pt-20 lg:px-24 ${authOpen ? "scale-[0.985] opacity-65 blur-[1px]" : ""}`}>
        <div className="flex max-w-[720px] flex-col">
          <p className="fx-in fx-d1 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.14em] text-gold">
            <span aria-hidden="true" className="h-px w-7 bg-gold" />
            Finanzas personales con IA
          </p>
          <h1 className="fx-in fx-d2 mt-7 font-serif text-[clamp(56px,8.4vw,124px)] font-light leading-[0.9] tracking-[-0.025em] text-balance text-[#f4eddf]">
            Sostén el hilo <em className="italic text-gold">de tu dinero.</em>
          </h1>
          <p className="fx-in fx-d3 mt-8 max-w-[460px] text-lg leading-relaxed text-pretty text-[#e2dacb]">
            FineX usa inteligencia artificial para analizar tus finanzas, anticipar patrones de gasto y convertir tus datos en decisiones claras.
          </p>
          <div className="fx-in fx-d4 mt-9 flex flex-wrap items-center gap-3">
            <PrimaryCta userAuthenticated={userAuthenticated} onRegister={onRegister} tone="gold" />
            <a href="#panel" className="inline-flex min-h-12 items-center rounded-control px-5 text-[15px] font-medium text-ivory transition-colors duration-500 hover:bg-ivory/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
              Ver el panel
            </a>
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-6 pt-16">
          <figure className="fx-in fx-d4 flex max-w-[380px] gap-4 border-t border-ivory/30 pt-3.5">
            <span className="pt-0.5 font-mono text-[11px] tracking-[0.12em] text-gold">I</span>
            <figcaption className="text-[13px] leading-relaxed text-[#d2c9b8]">
              <em className="font-serif text-[17px] italic text-ivory">El hilo.</em> Una figura en la llanura sostiene el hilo que la une a su dinero. FineX lo ordena, lo entiende y lo proyecta.
            </figcaption>
          </figure>
          <p className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-ivory/70 md:block">Desliza para entrar</p>
        </div>
      </div>
    </section>
  );
}

/* Cada palabra pasa del tono piedra a la tinta al cruzar la línea de activación. */
function TaglineReveal() {
  const words = useRef<(HTMLSpanElement | null)[]>([]);
  const [lit, setLit] = useState<boolean[]>(() => TAGLINE.map(() => false));

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      setLit(TAGLINE.map(() => true));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      setLit((current) => {
        let next = current;
        for (const entry of entries) {
          const index = words.current.indexOf(entry.target as HTMLSpanElement);
          if (index < 0 || current[index]) continue;
          if (entry.isIntersecting || entry.boundingClientRect.top < 0) {
            if (next === current) next = [...current];
            next[index] = true;
          }
        }
        return next;
      });
    }, { rootMargin: "0px 0px -35% 0px" });

    for (const word of words.current) {
      if (word) observer.observe(word);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <p className="font-serif text-[clamp(40px,5.6vw,80px)] font-light leading-[1.02] tracking-[-0.02em] text-balance md:col-span-2">
      {TAGLINE.map((word, index) => (
        <span
          key={`${word}-${index}`}
          ref={(element) => {
            words.current[index] = element;
          }}
          className="fx-word"
          data-lit={lit[index]}
        >
          {word}
          {index < TAGLINE.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}

function OrderScene() {
  return (
    <svg role="img" aria-label="Piedras dispersas en una llanura se ordenan en una columna" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="block h-full w-full">
      <rect width="400" height="500" fill="url(#paint-sky)" />
      <g filter="url(#paint-cloud)">
        <ellipse cx="124" cy="184" rx="146" ry="24" fill="#2f4a4d" />
        <ellipse cx="120" cy="178" rx="132" ry="18" fill="#89897c" />
        <ellipse cx="110" cy="170" rx="90" ry="12" fill="#e6d6b8" />
        <ellipse cx="94" cy="165" rx="44" ry="6" fill="#fff3da" />
      </g>
      <rect y="380" width="400" height="120" fill="url(#paint-plain)" />
      <ellipse cx="70" cy="420" rx="16" ry="7" fill="#d8c4a0" />
      <ellipse cx="120" cy="446" rx="11" ry="5" fill="#c9b28a" />
      <ellipse cx="330" cy="432" rx="14" ry="6" fill="#d8c4a0" />
      <path d="M232 400 L330 470 L338 466 L244 398 Z" fill="#2b140c" opacity="0.5" />
      <ellipse cx="236" cy="398" rx="36" ry="10" fill="#e5d3b1" />
      <ellipse cx="236" cy="380" rx="30" ry="10" fill="#d9c39d" />
      <ellipse cx="236" cy="362" rx="25" ry="9" fill="#e9d9ba" />
      <ellipse cx="236" cy="345" rx="20" ry="8" fill="#d2ba92" />
      <ellipse cx="236" cy="330" rx="14" ry="7" fill="url(#paint-orb)" />
      <PaintTexture width={400} height={500} />
    </svg>
  );
}

function UnderstandScene() {
  return (
    <svg role="img" aria-label="Un rayo de luz atraviesa un arco e ilumina el suelo" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="block h-full w-full">
      <rect width="400" height="500" fill="#14262d" />
      <rect x="60" y="120" width="280" height="300" fill="url(#paint-wall)" />
      <path d="M150 420 V250 A50 50 0 0 1 250 250 V420 Z" fill="#f1dfb8" />
      <path d="M150 420 V250 A50 50 0 0 1 250 250 V420 Z" fill="url(#paint-sky)" opacity="0.55" />
      <rect y="420" width="400" height="80" fill="url(#paint-plain)" />
      <path d="M150 420 L250 420 L360 500 L60 500 Z" fill="#f4e4be" opacity="0.55" />
      <path d="M340 120 L400 140 L400 420 L340 420 Z" fill="#0e1a1f" opacity="0.6" />
      <circle cx="200" cy="282" r="14" fill="url(#paint-orb)" filter="url(#paint-glow)" />
      <Figure x={208} y={486} shadow={0} />
      <PaintTexture width={400} height={500} />
    </svg>
  );
}

function ProjectScene() {
  return (
    <svg role="img" aria-label="La sombra larga de una figura se proyecta hacia un horizonte con una escalera" viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" className="block h-full w-full">
      <rect width="400" height="500" fill="url(#paint-sky)" />
      <Orb cx={300} cy={300} r={46} />
      <g filter="url(#paint-cloud)">
        <ellipse cx="290" cy="338" rx="124" ry="16" fill="#4e6461" />
        <ellipse cx="286" cy="334" rx="110" ry="11" fill="#b7a68a" />
        <ellipse cx="270" cy="330" rx="54" ry="5" fill="#f6e6c8" />
      </g>
      <rect y="360" width="400" height="140" fill="url(#paint-plain)" />
      <path d="M240 360 h40 v-14 h-30 v-14 h-20 v-14 h-12 v42 z" fill="#e3cfa9" />
      <path d="M98 452 L300 368 L304 372 L104 458 Z" fill="#2b140c" opacity="0.6" />
      <Figure x={96} y={458} shadow={0} />
      <PaintTexture width={400} height={500} />
    </svg>
  );
}

const gestures = [
  { number: "01", title: "Ordenar", text: "Reúne tus cuentas y coloca cada movimiento en su categoría, sin que tengas que revisarlos uno a uno.", Scene: OrderScene },
  { number: "02", title: "Entender", text: "Detecta patrones de gasto y te explica qué ha cambiado este mes, y por qué.", Scene: UnderstandScene },
  { number: "03", title: "Proyectar", text: "Anticipa tu saldo y te dice cuánto te falta para cada objetivo al ritmo que llevas.", Scene: ProjectScene },
];

function Triptych() {
  return (
    <section aria-labelledby="triptico-title" className="bg-ivory px-5 pb-24 md:px-12 md:pb-40 lg:px-24">
      <div className="mx-auto flex max-w-[1248px] flex-col gap-14">
        <div className="flex flex-wrap items-end justify-between gap-6 border-t border-[#cdbfa5] pt-6">
          <h2 id="triptico-title" className="font-serif text-[40px] font-normal tracking-[-0.015em]">Tres gestos, un solo hilo</h2>
          <p className="max-w-[380px] text-[15px] leading-relaxed text-ink-muted">Lo que haces cada mes con tu dinero, convertido en tres tiempos que FineX resuelve por ti.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {gestures.map(({ number, title, text, Scene }) => (
            <article key={title} className="fx-scene flex flex-col gap-6">
              <div className="aspect-[4/5] overflow-hidden rounded-[999px_999px_0_0] bg-petrol-deep">
                <Scene />
              </div>
              <div className="flex gap-4">
                <span className="pt-1.5 font-mono text-xs text-terracotta">{number}</span>
                <div className="flex flex-col gap-2">
                  <h3 className="font-serif text-[32px] font-normal">{title}</h3>
                  <p className="text-[15px] leading-relaxed text-ink-soft">{text}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const previewBudgets = [
  { name: "Alimentación", percent: 72 },
  { name: "Restaurantes", percent: 84, warning: true },
  { name: "Transporte", percent: 53 },
];

/* El panel colgado como un cuadro: marco de hilo dorado y cartela al pie. */
function FramedPanel() {
  return (
    <section id="panel" aria-labelledby="panel-title" className="relative overflow-hidden bg-[#13262d] px-5 py-24 md:px-12 md:py-40 lg:px-24">
      <div aria-hidden="true" className="absolute left-1/2 top-0 h-[700px] w-[900px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_50%_0%,rgba(221,191,138,0.18),rgba(221,191,138,0)_62%)]" />
      <div className="relative mx-auto flex max-w-[1120px] flex-col items-center gap-12">
        <div className="flex max-w-[640px] flex-col items-center gap-4 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-gold">II · El panel</p>
          <h2 id="panel-title" className="font-serif text-[clamp(40px,5vw,68px)] font-light leading-none tracking-[-0.02em] text-[#f4eddf]">Todo tu dinero, en <em className="italic">una sola vista</em></h2>
          <p className="leading-relaxed text-[#b8b2a4]">Saldo, presupuestos, movimientos y objetivos. Claro de leer, sin adornos donde importan los números.</p>
        </div>

        <figure className="fx-scene w-full border border-gold/50 p-3.5 shadow-[inset_0_0_0_6px_#13262d,inset_0_0_0_7px_rgba(221,191,138,0.28),0_60px_120px_-40px_rgba(0,0,0,0.7)]">
          <div aria-hidden="true" className="grid overflow-hidden bg-canvas text-ink md:grid-cols-[200px_minmax(0,1fr)]">
            <div className="hidden flex-col gap-1.5 bg-night-soft px-5 py-6 md:flex">
              <span className="mb-5 font-serif text-2xl text-ivory">FineX</span>
              <span className="flex items-center justify-between bg-ivory/8 px-2.5 py-2 text-[13px] text-ivory">Resumen<span className="size-1.5 bg-gold" /></span>
              {["Cuentas", "Movimientos", "Presupuestos", "Objetivos"].map((item) => (
                <span key={item} className="px-2.5 py-2 text-[13px] text-[#9ea6a3]">{item}</span>
              ))}
            </div>
            <div className="flex flex-col gap-5 p-7">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-gold-ink">Lunes, 17 de agosto</p>
                <p className="mt-1.5 font-serif text-[34px]">Buenos días, Ana</p>
              </div>
              <div className="polyptych md:grid-cols-3">
                <div className="flex min-h-[220px] flex-col gap-2 bg-petrol-deep p-5 text-ivory md:col-span-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-gold">Dinero disponible</span>
                  <span className="font-serif text-[52px] tracking-[-0.02em] lining-nums tabular-nums">4.892,40 €</span>
                  <svg viewBox="0 0 400 90" preserveAspectRatio="none" className="mt-auto h-[90px] w-full">
                    <path d="M0 70 L30 60 L60 64 L90 52 L120 56 L150 40 L180 46 L210 32 L240 44 L270 48 L300 38 L330 42 L360 26 L390 18 L400 22" fill="none" stroke="#ddbf8a" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
                    <rect x="386" y="14" width="8" height="8" fill="#f4e4be" />
                  </svg>
                </div>
                <div className="flex flex-col gap-3 bg-ivory-soft p-5">
                  <span className="text-sm font-semibold">Presupuestos</span>
                  {previewBudgets.map(({ name, percent, warning }) => (
                    <div key={name} className="flex flex-col gap-1.5">
                      <span className="flex justify-between text-xs text-ink-muted">{name}<span className={warning ? "text-terracotta-deep" : ""}>{percent}%</span></span>
                      <span className="block h-[3px] bg-[#e3daca]"><span className={`block h-[3px] ${warning ? "bg-terracotta" : "bg-petrol"}`} style={{ width: `${percent}%` }} /></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <figcaption className="flex flex-wrap justify-between gap-4 px-1 pt-4 text-[13px] text-[#a8a293]">
            <span><em className="font-serif text-base italic text-ivory">El panel.</em> Óleo de datos sobre fondo marfil, 2026.</span>
            <span className="font-mono text-[11px] tracking-[0.1em]">FINEX · RESUMEN</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function InsightMoment({ userAuthenticated, onRegister }: Pick<HomePageProps, "userAuthenticated" | "onRegister">) {
  return (
    <section aria-labelledby="insight-title" className="bg-ivory px-5 pb-24 pt-28 md:px-12 md:pb-40 md:pt-48 lg:px-24">
      <div className="mx-auto flex max-w-[1248px] flex-col gap-10">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-gold-ink">III · Un insight de FineX</p>
        <div className="relative">
          <svg aria-hidden="true" viewBox="0 0 120 120" className="absolute right-[3%] top-[-118px] hidden size-[120px] md:block">
            <circle cx="60" cy="42" r="5.5" fill="#1b2226" />
            <path d="M54 50 Q60 46 66 50 L69 86 L51 86 Z" fill="#1b2226" />
            <path d="M60 86 L118 112 L116 116 L58 90 Z" fill="#1b2226" opacity="0.18" />
          </svg>
          <h2 id="insight-title" className="font-serif text-[clamp(48px,7.4vw,112px)] font-light leading-[0.96] tracking-[-0.025em] text-balance">
            Este mes puedes ahorrar <em className="italic text-terracotta">146&nbsp;€</em> sin cambiar tus hábitos.
          </h2>
        </div>
        <div className="grid gap-8 border-t border-[#cdbfa5] pt-6 md:grid-cols-3">
          <p className="text-[15px] leading-relaxed text-ink-soft">Tus suscripciones y recibos variables han bajado un 11%. FineX te propone mover la diferencia a tu fondo de emergencia.</p>
          <p className="text-[15px] leading-relaxed text-ink-soft">Cada insight llega con su porqué y con una acción concreta. Tú decides si la aplicas.</p>
          <div><PrimaryCta userAuthenticated={userAuthenticated} onRegister={onRegister} tone="primary" /></div>
        </div>
      </div>
    </section>
  );
}

/* Cierre: un detalle ampliado del mismo cuadro, la figura sosteniendo el hilo. */
function Horizon({ userAuthenticated, onRegister }: Pick<HomePageProps, "userAuthenticated" | "onRegister">) {
  const video = useRef<HTMLVideoElement>(null);
  useStillVideo(video);

  return (
    <section aria-labelledby="cierre-title" className="relative isolate flex min-h-[720px] items-start justify-center overflow-hidden bg-night text-center">
      <video
        ref={video}
        src={HERO_VIDEO}
        poster={HERO_POSTER}
        className="absolute inset-0 -z-10 h-full w-full origin-[52%_86%] scale-[1.5] object-cover"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(10,21,27,0.78)_0%,rgba(10,21,27,0.45)_45%,rgba(10,21,27,0.1)_75%,rgba(10,21,27,0.5)_100%)]" />
      <div className="flex max-w-[760px] flex-col items-center gap-6 px-5 pt-28">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-gold">IV · El horizonte</p>
        <h2 id="cierre-title" className="font-serif text-[clamp(48px,6.4vw,96px)] font-light leading-[0.95] tracking-[-0.025em] text-[#f4eddf]">
          Empieza a ver <em className="italic text-gold">con claridad.</em>
        </h2>
        <p className="text-[17px] leading-relaxed text-[#e2dacb]">Crea tu espacio privado en menos de un minuto. Sin tarjetas ni compromisos.</p>
        <PrimaryCta userAuthenticated={userAuthenticated} onRegister={onRegister} tone="gold" className="mt-2" />
      </div>
    </section>
  );
}

export function HomePage({ userAuthenticated, authOpen, authPanel, onLogin, onRegister }: HomePageProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-night font-sans text-ink">
      <PaintDefs />
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-ivory focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary">
        Saltar al contenido
      </a>
      <Hero userAuthenticated={userAuthenticated} authOpen={authOpen} authPanel={authPanel} onLogin={onLogin} onRegister={onRegister} />

      <div id="contenido">
        <section aria-label="Lo que hace FineX" className="bg-ivory px-5 py-24 md:px-12 md:py-44 lg:px-24">
          <div className="mx-auto grid max-w-[1248px] items-start gap-12 md:grid-cols-3">
            <p className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.14em] text-gold-ink">
              <span aria-hidden="true" className="size-2 bg-terracotta" />
              Lo que hace FineX
            </p>
            <TaglineReveal />
          </div>
        </section>

        <Triptych />
        <FramedPanel />
        <InsightMoment userAuthenticated={userAuthenticated} onRegister={onRegister} />
        <Horizon userAuthenticated={userAuthenticated} onRegister={onRegister} />

        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-ivory/12 bg-night px-5 py-7 text-sm text-[#a8a293] md:px-12 lg:px-24">
          <span><strong className="font-serif text-xl font-medium text-ivory">FineX</strong> · © 2026</span>
        </footer>
      </div>
    </main>
  );
}
