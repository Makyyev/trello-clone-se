// app/api/boards/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/boards  -> list all boards
export async function GET(_request: NextRequest) {
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

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("GET /api/boards error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/boards  -> create new board
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = (body.name ?? "").toString().trim();

    if (!name) {
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

    return NextResponse.json(
      {
        id: insertResult.insertedId.toString(),
        name,
        createdAt: now,
        updatedAt: now,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/boards error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
