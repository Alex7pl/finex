/** Calendar boundaries in Europe/Madrid, independent of the server's local zone. */
export function madridMonth(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  return `${parts.find((part) => part.type === "year")!.value}-${parts.find((part) => part.type === "month")!.value}`;
}
export function monthStart(month: string, offset = 0) {
  const [year, number] = month.split("-").map(Number);
  const local = new Date(Date.UTC(year, number - 1 + offset, 1));
  // At Madrid midnight the UTC offset is always +01:00 or +02:00.
  const label = new Intl.DateTimeFormat("en", {
    timeZone: "Europe/Madrid",
    timeZoneName: "longOffset",
  })
    .formatToParts(local)
    .find((part) => part.type === "timeZoneName")!.value;
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(label)!;
  const minutes =
    (Number(match[2]) * 60 + Number(match[3])) * (match[1] === "+" ? 1 : -1);
  return new Date(local.getTime() - minutes * 60000);
}
export function monthLabel(month: string) {
  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(monthStart(month));
}
export function dashboardHref(
  filters: {
    month: string;
    range: string;
    search: string;
    accountId: string;
    page: number;
  },
  updates: Record<string, string | null>,
) {
  const params = new URLSearchParams({
    month: filters.month,
    range: filters.range,
  });
  if (filters.search) params.set("search", filters.search);
  if (filters.accountId) params.set("accountId", filters.accountId);
  if (filters.page > 1) params.set("page", String(filters.page));
  for (const [key, value] of Object.entries(updates))
    value === null ? params.delete(key) : params.set(key, value);
  return `/dashboard?${params}`;
}
