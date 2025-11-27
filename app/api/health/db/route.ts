// src/app/api/health/db/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB_NAME || "trello_clone_se";
    const db = client.db(dbName);

    // Simple command to check we can talk to the DB
    const admin = db.admin();
    const serverStatus = await admin.serverStatus();

    return NextResponse.json({
      ok: true,
      host: serverStatus.host,
      version: serverStatus.version,
    });
  } catch (error: any) {
    console.error("DB health check error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error.message ?? "Unknown error",
      },
      { status: 500 }
    );
  }
}
