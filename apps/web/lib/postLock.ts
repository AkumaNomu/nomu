import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// HMAC cookie lock for password-protected posts. Unlocking sets an httpOnly
// cookie; the post page verifies it server-side and renders the real article.
// Set UNLOCK_SECRET in production so cookies survive restarts and deploys.
const COOKIE_NAME = "post-unlock";
const MAX_AGE_SECONDS = 60 * 60;

function getSecret(): Buffer {
  const configured = process.env.UNLOCK_SECRET;
  if (configured) return Buffer.from(configured, "utf8");
  const fallback = (globalThis as { __unlockSecret?: Buffer }).__unlockSecret;
  if (fallback) return fallback;
  const generated = randomBytes(32);
  (globalThis as { __unlockSecret?: Buffer }).__unlockSecret = generated;
  return generated;
}

function sign(slug: string, expiry: number): string {
  return createHmac("sha256", getSecret()).update(`${slug}.${expiry}`, "utf8").digest("hex");
}

export function mintUnlockCookie(slug: string): { name: string; value: string; maxAge: number } {
  const expiry = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  return { name: COOKIE_NAME, value: `${slug}.${expiry}.${sign(slug, expiry)}`, maxAge: MAX_AGE_SECONDS };
}

export function verifyUnlockCookie(slug: string, header: string | null): boolean {
  if (!header) return false;
  const match = /(?:^|;\s*)post-unlock=([^;]+)/.exec(header);
  if (!match) return false;
  const [valueSlug, valueExpiry, valueSig] = decodeURIComponent(match[1]).split(".");
  if (valueSlug !== slug) return false;
  const expiry = Number(valueExpiry);
  if (!Number.isFinite(expiry) || expiry < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(slug, expiry), "utf8");
  const actual = Buffer.from(valueSig ?? "", "utf8");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const expected = Buffer.from(passwordHash, "hex");
  const actual = createHash("sha256").update(password, "utf8").digest();
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
