export function cents(value: string): bigint {
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^[+-]/, "").split(".");
  const amount = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return negative ? -amount : amount;
}
export function decimal(value: bigint) {
  const abs = value < 0n ? -value : value;
  return `${value < 0n ? "-" : ""}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}
export function formatMoney(value: string) {
  const amount = cents(value);
  const abs = amount < 0n ? -amount : amount;
  return `${amount < 0n ? "−" : ""}${(abs / 100n).toLocaleString("es-ES")},${String(abs % 100n).padStart(2, "0")} €`;
}
export const dateTime = (value: string) =>
  new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
