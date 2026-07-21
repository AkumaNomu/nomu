import "server-only";

import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { commentsDb } from "./db";

const SESSION_COOKIE = "nomu-session";
const SESSION_DAYS = 30;

export type CurrentUser = { id: string; username: string };

function hashPassword(password: string, salt: string) {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

function passwordMatches(password: string, stored: string) {
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  const actual = Buffer.from(hashPassword(password, salt).split(":")[1], "hex");
  const expected = Buffer.from(digest, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (!commentsDb) return null;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  const rows = await commentsDb`
    SELECT users.id, users.username
    FROM public.sessions
    JOIN public.users ON users.id = sessions.user_id
    WHERE sessions.id = ${sessionId} AND sessions.expires_at > now()
    LIMIT 1
  ` as CurrentUser[];
  return rows[0] ?? null;
}

export async function authenticate(action: "signup" | "login", username: string, password: string) {
  if (!commentsDb) throw new Error("Comments backend is not configured.");
  const normalized = username.trim().toLowerCase();
  if (!/^[a-z0-9_]{3,24}$/.test(normalized)) throw new Error("Username: 3–24 lowercase letters, numbers, or underscores.");
  if (password.length < 8 || password.length > 100) throw new Error("Password must be 8–100 characters.");

  let user: CurrentUser | undefined;
  if (action === "signup") {
    const salt = randomBytes(16).toString("hex");
    const rows = await commentsDb`
      INSERT INTO public.users (username, password_hash)
      VALUES (${normalized}, ${hashPassword(password, salt)})
      RETURNING id, username
    ` as CurrentUser[];
    user = rows[0];
  } else {
    const rows = await commentsDb`
      SELECT id, username, password_hash FROM public.users WHERE lower(username) = ${normalized} LIMIT 1
    ` as (CurrentUser & { password_hash: string })[];
    if (!rows[0] || !passwordMatches(password, rows[0].password_hash)) throw new Error("Username or password is incorrect.");
    user = { id: rows[0].id, username: rows[0].username };
  }

  const sessionId = randomUUID();
  await commentsDb`
    INSERT INTO public.sessions (id, user_id, expires_at)
    VALUES (${sessionId}, ${user.id}, now() + interval '30 days')
  `;
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
  return user;
}

export async function signOut() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (commentsDb && sessionId) await commentsDb`DELETE FROM public.sessions WHERE id = ${sessionId}`;
  cookieStore.delete(SESSION_COOKIE);
}
