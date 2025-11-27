import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

function getObjectId(id: string) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// Next 16: params is a Promise
type RouteContext = { params: Promise<{ boardId: string }> };

// GET /api/boards/:boardId/lists
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { boardId } = await context.params;
    const objectId = getObjectId(boardId);

    if (!objectId) {
      return NextResponse.json(
        { error: "Invalid board id" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const listsCollection = db.collection("lists");

    const lists = await listsCollection
      .find({ boardId: objectId })
      .sort({ position: 1 })
      .toArray();

    const response = lists.map((l: any) => ({
      id: l._id.toString(),
      boardId: l.boardId.toString(),
      name: l.name as string,
      position: l.position as number,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt,
    }));

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("GET /api/boards/[boardId]/lists error:", error);
    return NextResponse.json(
      { error: error.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

// POST /api/boards/:boardId/lists
export async function POST(request: Request, context: RouteContext) {
  try {
    const { boardId } = await context.params;
    const objectId = getObjectId(boardId);

    if (!objectId) {
      return NextResponse.json(
        { error: "Invalid board id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const name = (body.name ?? "").toString().trim();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const listsCollection = db.collection("lists");

    // Compute next position for this board
    const lastList = await listsCollection
      .find({ boardId: objectId })
      .sort({ position: -1 })
      .limit(1)
      .toArray();

    const nextPosition =
      lastList.length > 0 ? (lastList[0].position as number) + 1 : 1;

    const now = new Date();

    const doc = {
      boardId: objectId,
      name,
      position: nextPosition,
      createdAt: now,
      updatedAt: now,
    };

    const result = await listsCollection.insertOne(doc);

    const created = {
      id: result.insertedId.toString(),
      boardId: boardId,
      name,
      position: nextPosition,
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/boards/[boardId]/lists error:", error);
    return NextResponse.json(
      { error: error.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
