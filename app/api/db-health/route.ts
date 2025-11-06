import { NextResponse } from "next/server";
import { getDatabaseConfig, testConnection } from "@/lib/database/mysql-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ok = await testConnection();
    const cfg = getDatabaseConfig();

    if (ok) {
      return NextResponse.json({
        success: true,
        mysqlConnected: true,
        host: cfg.host,
        database: cfg.database,
      });
    }

    return NextResponse.json(
      { success: false, mysqlConnected: false },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        mysqlConnected: false,
        error: err?.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}