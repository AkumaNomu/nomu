import { NextResponse } from "next/server";
import { isSupabaseAdminConfigured, isSupabaseConfigured } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    ok: true,
    supabaseReadConfigured: isSupabaseConfigured(),
    supabaseAdminConfigured: isSupabaseAdminConfigured(),
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "archive-assets"
  });
}
