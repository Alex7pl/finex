/* Fondo del dashboard: marfil con una luz cálida que entra desde arriba a la
   izquierda, como en un interior pintado. Sin texturas: los datos van limpios. */
export function DashboardBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 bg-canvas">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_0%,#faf6ee_0%,rgba(250,246,238,0)_60%)]" />
    </div>
  );
}
