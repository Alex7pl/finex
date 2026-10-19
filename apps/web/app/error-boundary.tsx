import { isRouteErrorResponse } from "react-router";
import { Figure, Orb, PaintDefs, PaintTexture } from "@/components/art/Paint.js";

export function ErrorBoundary({ error }: { error: unknown }) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;
  let requestId: string | undefined;

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      message = "404";
      details = "The requested page could not be found.";
    } else if (error.status >= 500) {
      message = "Something went wrong";
      details = "The service is temporarily unavailable. Please try again.";
    } else {
      message = "Request failed";
      details = "We could not complete your request.";
    }

    if (
      typeof error.data === "object" &&
      error.data !== null &&
      "requestId" in error.data &&
      typeof error.data.requestId === "string"
    ) {
      requestId = error.data.requestId;
    }
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5 py-16 font-sans text-ink">
      <PaintDefs />
      <div className="flex w-full max-w-[560px] flex-col items-center gap-5 text-center">
        <svg role="img" aria-label="Un hilo dorado roto entre el cielo y una figura" viewBox="0 0 300 200" className="h-[200px] w-full max-w-[300px]">
          <rect width="300" height="200" fill="#efe6d4" />
          <Orb cx={214} cy={56} r={26} />
          <path d="M200 78 C 190 96, 182 104, 176 112" fill="none" stroke="#b38a4e" strokeWidth={1.2} />
          <path d="M150 136 C 140 150, 128 160, 112 168" fill="none" stroke="#b38a4e" strokeWidth={1.2} />
          <circle cx="176" cy="112" r="1.8" fill="#a9502c" />
          <circle cx="150" cy="136" r="1.8" fill="#a9502c" />
          <rect y="176" width="300" height="24" fill="#d6ccb9" />
          <Figure x={108} y={184} color="#1b2226" shadow={88} />
          <PaintTexture width={300} height={200} />
        </svg>
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-gold-ink">Se ha perdido el hilo</p>
        <h1 className="font-serif text-[48px] font-normal leading-none tracking-[-0.015em]">{message}</h1>
        <p className="text-sm leading-relaxed text-ink-muted">{details}</p>
        {requestId && <p className="font-mono text-xs text-ink-muted">Request ID: {requestId}</p>}
        <a href="/" className="action-primary mt-2 inline-flex min-h-11 items-center rounded-control px-5 text-sm font-semibold">Volver al inicio</a>
        {stack && (
          <pre className="mt-4 w-full overflow-x-auto border border-border bg-ivory-soft p-4 text-left text-xs">
            <code>{stack}</code>
          </pre>
        )}
      </div>
    </main>
  );
}
