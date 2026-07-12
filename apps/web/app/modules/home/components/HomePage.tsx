import type { ReactNode } from "react";

const HERO_VIDEO = "/hero-background.mp4";
const CARD_IMAGE = "/jakub-zerdzicki-U4-I4oH4xlg-unsplash.jpg";

interface HomePageProps {
  authOpen: boolean;
  authPanel?: ReactNode;
  onLogin: (trigger: HTMLButtonElement) => void;
  onRegister: (trigger: HTMLButtonElement) => void;
}

export function HomePage({ authOpen, authPanel, onLogin, onRegister }: HomePageProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-background font-sans text-foreground">
      <header className="flex min-h-21 items-center justify-between px-5 py-3 sm:px-7 lg:px-9">
        <a href="/" className="text-2xl font-semibold tracking-normal text-foreground-muted sm:text-3xl" aria-label="FineX home">
          FineX
        </a>

        <nav aria-label="Principal" className="flex items-center gap-4 text-sm sm:gap-8 sm:text-base lg:gap-16">
          <button type="button" onClick={(event) => onLogin(event.currentTarget)} className="hidden text-muted-foreground transition-colors hover:text-secondary-foreground sm:block">
            Iniciar sesión
          </button>
          <button type="button" onClick={(event) => onRegister(event.currentTarget)} className="rounded-[22px] bg-primary px-6 py-4 font-medium text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-lg sm:px-9 lg:px-12">
            Registrarse
          </button>
        </nav>
      </header>

      <section className="px-2 pb-2 sm:px-3">
        <div className="relative min-h-[calc(100vh-96px)] overflow-hidden rounded-[24px] bg-hero-surface sm:rounded-[28px]">
          <video src={HERO_VIDEO} className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline aria-label="Animación abstracta de fondo" />
          <div className="absolute inset-0 bg-hero-overlay/55" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-hero/85 via-hero/35 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-hero/70 to-transparent" />

          {authPanel}

          <div className={`relative z-10 flex min-h-[calc(100vh-96px)] flex-col px-5 py-10 text-white transition-[transform,filter,opacity] duration-500 sm:px-10 sm:py-12 lg:px-24 lg:py-20 ${authOpen ? "scale-[0.985] opacity-65 blur-[1px]" : ""}`}>
            <div className="max-w-6xl">
              <h1 className="max-w-5xl text-6xl font-normal leading-[0.98] tracking-normal color-secondary-foreground sm:text-7xl md:text-8xl lg:text-9xl">
                Digitaliza tus<br />finanzas
              </h1>
            </div>

            <div className="mt-auto grid gap-8 pt-12 lg:grid-cols-[320px_1fr] lg:items-end">
              <div className="max-w-sm">
                <p className="text-base leading-tight text-white sm:text-lg">
                  FineX usa inteligencia artificial para analizar tus finanzas, anticipar patrones de gasto y convertir tus datos en decisiones claras, precisas y accionables.
                </p>
              </div>

              <div className="justify-self-stretch lg:justify-self-end">
                <article className="grid overflow-hidden rounded-[18px] bg-surface text-surface-foreground shadow-[0_20px_55px_rgba(0,0,0,0.14)] sm:grid-cols-[minmax(0,1fr)_190px] lg:w-[560px]">
                  <div className="flex min-h-44 flex-col p-5 sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-4 text-xs text-muted sm:text-sm">
                      <span>Noticias</span>
                      <span>Asistente IA</span>
                    </div>
                    <h2 className="max-w-sm text-xl font-normal leading-tight text-surface-heading sm:text-2xl">
                      FineX lanza una experiencia inteligente para ordenar, entender y proyectar tu dinero
                    </h2>
                  </div>

                  <div className="relative min-h-44 overflow-hidden">
                    <img src={CARD_IMAGE} alt="Visualización abstracta de datos financieros" className="h-full w-full object-cover" />
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
