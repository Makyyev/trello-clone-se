// app/api/boards/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const COLLECTION = "boards";

// GET /api/boards  -> list all boards
export async function GET() {
  try {
    const db = await getDb();
    const docs = await db
      .collection(COLLECTION)
      .find({})
      .sort({ createdAt: 1 })
      .toArray();

    const boards = docs.map((b: any) => ({
      id: b._id.toString(),
      name: b.name ?? "Untitled board",
      createdAt: b.createdAt ?? new Date().toISOString(),
      updatedAt: b.updatedAt ?? b.createdAt ?? new Date().toISOString(),
    }));

    return NextResponse.json(boards);
  } catch (err) {
    console.error("GET /api/boards error:", err);
    return NextResponse.json(
      { error: "Failed to load boards" },
      { status: 500 }
    );
  }
}

// POST /api/boards  -> create new board
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = (body?.name ?? "").toString().trim();

    if (!name) {
      return NextResponse.json(
        { error: "Board name is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date();

    const result = await db.collection(COLLECTION).insertOne({
      name,
      createdAt: now,
      updatedAt: now,
    });

    const created = {
      id: result.insertedId.toString(),
      name,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/boards error:", err);
    return NextResponse.json(
      { error: "Failed to create board" },
      { status: 500 }
    );
  }
}
