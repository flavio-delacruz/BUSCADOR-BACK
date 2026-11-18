import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(scrypt);
const length = 64;
const pattern = /^scrypt\$([a-f0-9]{32})\$([a-f0-9]{128})$/;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(password, salt, length) as Buffer;
  return `scrypt$${salt}$${hash.toString("hex")}`;
}

export async function matchesPassword(password: string, stored: string): Promise<boolean> {
  const match = pattern.exec(stored);
  if (!match) return false;
  const expected = Buffer.from(match[2], "hex");
  const actual = await derive(password, match[1], length) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
