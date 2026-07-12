import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, expectedHex] = stored.split("$");
  if (algorithm !== "scrypt" || !salt || !expectedHex) {
    const supplied = Buffer.from(password);
    const expected = Buffer.from(stored);
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  }

  const expected = Buffer.from(expectedHex, "hex");
  const supplied = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}
