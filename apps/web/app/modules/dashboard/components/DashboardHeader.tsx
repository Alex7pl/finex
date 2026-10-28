import { ListIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Form } from "react-router";
import type { DashboardData } from "../dashboard.types.js";
import { madridMonth } from "../dashboard-period.js";

const control = "action-secondary flex min-h-10 items-center rounded-control";
export function DashboardHeader({
  dashboard,
  onOpenMenu,
  onOpenProfile,
}: {
  dashboard: DashboardData;
  onOpenMenu: () => void;
  onOpenProfile: () => void;
}) {
  const { user, filters, accounts, now } = dashboard;
  const initials = user.username
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("")
    .toLocaleUpperCase("es-ES");
  return (
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border bg-canvas/92 px-4 py-3.5 backdrop-blur-sm sm:px-6 lg:px-10">
      <button
        type="button"
        onClick={onOpenMenu}
        className={`${control} size-10 shrink-0 justify-center lg:hidden`}
        aria-label="Abrir menú"
      >
        <ListIcon size={18} aria-hidden="true" />
      </button>
      <Form
        method="get"
        action="/dashboard"
        key={`${filters.month}-${filters.accountId}-${filters.search}-${filters.range}`}
        className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
        role="search"
      >
        <input type="hidden" name="range" value={filters.range} />
        <label className="field flex h-10 min-w-[160px] flex-1 items-center gap-2 px-3 text-ink-muted">
          <MagnifyingGlassIcon size={16} aria-hidden="true" />
          <input
            name="search"
            defaultValue={filters.search}
            maxLength={200}
            aria-label="Buscar movimientos"
            placeholder="Buscar movimientos"
            className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none"
          />
        </label>
        <label className="sr-only" htmlFor="dashboard-month">
          Mes del resumen
        </label>
        <input
          id="dashboard-month"
          name="month"
          type="month"
          defaultValue={filters.month}
          max={madridMonth(new Date(now))}
          required
          className="field h-10 max-w-[170px] px-2 text-sm"
          onChange={(event) => {
            if (event.currentTarget.validity.valid)
              event.currentTarget.form?.requestSubmit();
          }}
        />
        <label className="sr-only" htmlFor="dashboard-account">
          Filtrar por cuenta
        </label>
        <select
          id="dashboard-account"
          name="accountId"
          defaultValue={filters.accountId}
          className="field h-10 max-w-[200px] px-2 text-sm"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          <option value="">Todas las cuentas</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        <button type="submit" className={`${control} px-3 text-sm`}>
          Buscar
        </button>
      </Form>
      <button
        type="button"
        onClick={onOpenProfile}
        className={`${control} gap-2.5 py-1 pl-1 pr-2`}
        aria-label={`Abrir perfil de ${user.username}`}
      >
        <span className="grid size-8 place-items-center rounded-[999px_999px_0_0] bg-primary font-serif text-base text-ivory">
          {initials}
        </span>
        <span className="hidden max-w-[160px] truncate text-sm font-semibold xl:block">
          {user.username}
        </span>
      </button>
    </header>
  );
}
