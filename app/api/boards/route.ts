// app/api/boards/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { logApiRequest } from "@/lib/logger";

export async function GET() {
  const path = "/api/boards";
  try {
    const db = await getDb();
    const boardsCollection = db.collection("boards");

    const boards = await boardsCollection
      .find({})
      .sort({ createdAt: 1 })
      .toArray();

    const data = boards.map((b) => ({
      id: b._id.toString(),
      name: b.name as string,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));

    logApiRequest({ method: "GET", path, status: 200, extra: { count: data.length } });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/boards error:", error);
    logApiRequest({
      method: "GET",
      path,
      status: 500,
      extra: { error: error?.message },
    });
    return NextResponse.json(
      { error: error.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const path = "/api/boards";
  try {
    const body = await request.json();
    const name = (body.name ?? "").toString().trim();

    if (!name) {
      logApiRequest({
        method: "POST",
        path,
        status: 400,
        extra: { reason: "missing_name" },
      });
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const boardsCollection = db.collection("boards");

    const now = new Date();

    const insertResult = await boardsCollection.insertOne({
      name,
      createdAt: now,
      updatedAt: now,
    });

    const payload = {
      id: insertResult.insertedId.toString(),
      name,
      createdAt: now,
      updatedAt: now,
    };

    logApiRequest({
      method: "POST",
      path,
      status: 201,
      extra: { id: payload.id },
    });

    return NextResponse.json(payload, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/boards error:", error);
    logApiRequest({
      method: "POST",
      path,
      status: 500,
      extra: { error: error?.message },
    });
    return NextResponse.json(
      { error: error.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
