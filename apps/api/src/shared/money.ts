export function cents(value: string): bigint {
  const sign = value.startsWith("-") ? -1n : 1n;
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  return sign * (BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0")));
}
export function money(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  return `${sign}${abs / 100n}.${String(abs % 100n).padStart(2, "0")}`;
}
export const progress = (current: bigint, target: bigint) =>
  target === 0n ? 0 : Number((current * 10000n) / target) / 100;
