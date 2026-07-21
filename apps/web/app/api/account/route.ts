import { NextResponse } from "next/server";
import { authenticate, getCurrentUser, signOut } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ user: await getCurrentUser() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { action?: "signup" | "login" | "logout"; username?: string; password?: string };
    if (body.action === "logout") {
      await signOut();
      return NextResponse.json({ user: null });
    }
    if (body.action !== "signup" && body.action !== "login") throw new Error("Choose sign up or log in.");
    const user = await authenticate(body.action, body.username ?? "", body.password ?? "");
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update account." }, { status: 400 });
  }
}
