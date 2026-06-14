import { AlignJustify, ArrowRight } from "lucide-react";
import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [{ title: "FineX" }];
}

const HERO_VIDEO = "/hero-background.mp4";
const CARD_IMAGE = "/jakub-zerdzicki-U4-I4oH4xlg-unsplash.jpg";

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f8f5] font-sans text-[#595e5b]">
      <header className="flex min-h-21 items-center justify-between px-5 py-3 sm:px-7 lg:px-9">
        <a
          href="/"
          className="text-2xl font-semibold tracking-normal text-[#626765] sm:text-3xl"
          aria-label="FineX home"
        >
          FineX
        </a>

        <nav
          aria-label="Principal"
          className="flex items-center gap-4 text-sm sm:gap-8 sm:text-base lg:gap-16"
        >
          <button className="hidden items-center gap-3 text-[#4f5552] transition-colors hover:text-[#172f25] sm:flex">
            Menu
            <AlignJustify className="h-5 w-5" strokeWidth={1.8} />
          </button>
          <a
            href="/login"
            className="hidden text-[#4f5552] transition-colors hover:text-[#172f25] sm:block"
          >
            Iniciar sesión
          </a>
          <a
            href="/contact"
            className="rounded-[22px] bg-[#ddffd5] px-6 py-4 font-medium text-[#4f5552] transition-colors hover:bg-[#d0ffc6] sm:px-9 lg:px-12"
          >
            Registrarse
          </a>
        </nav>
      </header>

      <section className="px-2 pb-2 sm:px-3">
        <div className="relative min-h-[calc(100vh-96px)] overflow-hidden rounded-[24px] bg-[#1d332c] sm:rounded-[28px]">
          <video
            src={HERO_VIDEO}
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            aria-label="Animación abstracta de fondo"
          />
          <div className="absolute inset-0 bg-[#173229]/55" />
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#18342b]/85 via-[#18342b]/35 to-transparent" />
          <div className="absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-[#18342b]/70 to-transparent" />

          <div className="relative z-10 flex min-h-[calc(100vh-96px)] flex-col px-5 py-10 text-white sm:px-10 sm:py-12 lg:px-24 lg:py-20">
            <div className="max-w-6xl">
              <h1 className="max-w-5xl text-6xl font-normal leading-[0.98] tracking-normal text-[#dfffda] sm:text-7xl md:text-8xl lg:text-9xl">
                Digitaliza tus
                <br />
                finanzas con IA
              </h1>
            </div>

            <div className="mt-auto grid gap-8 pt-12 lg:grid-cols-[320px_1fr] lg:items-end">
              <div className="max-w-sm">
                <p className="text-base leading-tight text-white sm:text-lg">
                  FineX usa inteligencia artificial para analizar tus finanzas,
                  anticipar patrones de gasto y convertir tus datos en
                  decisiones claras, precisas y accionables.
                </p>
              </div>

              <div className="justify-self-stretch lg:justify-self-end">
                <article className="grid overflow-hidden rounded-[18px] bg-white text-[#606260] shadow-[0_20px_55px_rgba(0,0,0,0.14)] sm:grid-cols-[minmax(0,1fr)_190px] lg:w-[560px]">
                  <div className="flex min-h-44 flex-col p-5 sm:p-6">
                    <div className="mb-4 flex items-center justify-between gap-4 text-xs text-[#646866] sm:text-sm">
                      <span>Noticias</span>
                      <span>Asistente IA</span>
                    </div>
                    <h2 className="max-w-sm text-xl font-normal leading-tight text-[#5e615f] sm:text-2xl">
                      FineX lanza una experiencia inteligente para ordenar,
                      entender y proyectar tu dinero
                    </h2>
                    <a
                      href="/news"
                      aria-label="Leer noticia"
                      className="mt-auto inline-flex h-8 w-14 items-center justify-center rounded-[9px] bg-[#ddffd5] text-[#55615a] transition-colors hover:bg-[#d0ffc6]"
                    >
                      <ArrowRight className="h-5 w-5" strokeWidth={1.8} />
                    </a>
                  </div>

                  <div className="relative min-h-44 overflow-hidden">
                    <img
                      src={CARD_IMAGE}
                      alt="Visualización abstracta de datos financieros"
                      className="h-full w-full object-cover"
                    />
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
