import {
  GearIcon,
  PiggyBankIcon,
  QuestionIcon,
  ReceiptIcon,
  SignOutIcon,
  SquaresFourIcon,
  TargetIcon,
  WalletIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Orb, PaintTexture } from "@/components/art/Paint.js";

const navItems = [
  { label: "Resumen", icon: SquaresFourIcon, active: true },
  { label: "Cuentas", icon: WalletIcon },
  { label: "Movimientos", icon: ReceiptIcon },
  { label: "Presupuestos", icon: TargetIcon },
  { label: "Objetivos", icon: PiggyBankIcon },
];

const mobileItems = [
  { label: "Resumen", icon: SquaresFourIcon, active: true },
  { label: "Cuentas", icon: WalletIcon },
  { label: "Movimientos", icon: ReceiptIcon },
  { label: "Objetivos", icon: TargetIcon },
];

const fluid =
  "transition-[background-color,color,transform] duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] active:scale-[0.985] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold";
const activeItem = "bg-ivory/8 font-medium text-ivory";
const idleItem = "text-[#a9b2af] hover:bg-ivory/6 hover:text-ivory";

/* Plan: una ventana en arco a la escena de la portada, en miniatura. */
function PlanCard() {
  return (
    <div className="mb-3 flex flex-col gap-2.5">
      <div className="relative h-[112px] overflow-hidden rounded-[999px_999px_0_0]">
        <svg
          aria-hidden="true"
          viewBox="0 0 216 112"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
        >
          <rect width="216" height="112" fill="url(#paint-sky)" />
          <Orb cx={136} cy={50} r={24} />
          <g filter="url(#paint-cloud)">
            <ellipse cx="118" cy="76" rx="70" ry="9" fill="#2f4a4d" />
            <ellipse cx="116" cy="74" rx="64" ry="7" fill="#9a9483" />
            <ellipse cx="110" cy="71" rx="40" ry="4" fill="#e8d8ba" />
          </g>
          <rect y="92" width="216" height="20" fill="#94482a" />
          <rect y="90" width="216" height="4" fill="#d9b98e" opacity="0.45" />
          <PaintTexture width={216} height={112} />
        </svg>
      </div>
      <p className="px-3 text-xs text-[#c9cfcb]">
        <span className="block font-mono text-[10px] tracking-[0.14em] text-gold">
          TU RESUMEN
        </span>
        Tus cuentas, de un vistazo
      </p>
    </div>
  );
}

export function DashboardSidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="fixed inset-0 z-40 bg-night/40 lg:hidden"
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] flex-col gap-8 overflow-y-auto bg-night-soft px-4 pb-5 pt-7 text-[#c9cfcb] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-3">
          <a
            href="/dashboard"
            aria-label="FineX, resumen"
            className="font-serif text-[30px] font-medium text-ivory"
          >
            FineX
          </a>
          <button
            type="button"
            onClick={onClose}
            className={`grid size-10 place-items-center text-ivory hover:bg-ivory/8 lg:hidden ${fluid}`}
            aria-label="Cerrar menú"
          >
            <XIcon size={18} aria-hidden="true" />
          </button>
        </div>
        <nav
          aria-label="Navegación principal"
          className="flex flex-col gap-0.5"
        >
          {navItems.map(({ label, icon: Icon, active }) => (
            <a
              key={label}
              href={active ? "/dashboard" : `#${label.toLowerCase()}`}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 px-3 text-sm ${fluid} ${active ? activeItem : idleItem}`}
            >
              <Icon size={18} weight="light" aria-hidden="true" />
              <span className="flex-1">{label}</span>
              {active ? (
                <span aria-hidden="true" className="light-node size-1.5" />
              ) : null}
            </a>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-1 text-[13px]">
          <PlanCard />
        </div>
      </aside>
    </>
  );
}

export function MobileNavigation() {
  return (
    <nav
      aria-label="Navegación móvil"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 bg-night-soft px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 lg:hidden"
    >
      {mobileItems.map(({ label, icon: Icon, active }) => (
        <a
          key={label}
          href={active ? "/dashboard" : `#${label.toLowerCase()}`}
          aria-current={active ? "page" : undefined}
          className={`relative flex flex-col items-center gap-1 py-2 text-xs ${fluid} ${active ? "text-ivory" : "text-[#a9b2af]"}`}
        >
          {active ? (
            <span
              aria-hidden="true"
              className="light-node absolute top-0 size-1.5"
            />
          ) : null}
          <Icon size={20} weight="light" aria-hidden="true" />
          {label}
        </a>
      ))}
    </nav>
  );
}
