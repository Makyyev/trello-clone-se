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

// Next 16: params is a Promise and must be awaited
type RouteContext = { params: Promise<{ boardId: string }> };

// GET single board
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
    const boardsCollection = db.collection("boards");

    const board = await boardsCollection.findOne({ _id: objectId });

    if (!board) {
      return NextResponse.json(
        { error: "Board not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: board._id.toString(),
      name: board.name as string,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    });
  } catch (error: any) {
    console.error("GET /api/boards/[boardId] error:", error);
    return NextResponse.json(
      { error: error.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH rename board
export async function PATCH(request: Request, context: RouteContext) {
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
    const boardsCollection = db.collection("boards");

    const now = new Date();

    const result = await boardsCollection.findOneAndUpdate(
      { _id: objectId },
      { $set: { name, updatedAt: now } },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return NextResponse.json(
        { error: "Board not found" },
        { status: 404 }
      );
    }

    const board = result.value;

    return NextResponse.json({
      id: board._id.toString(),
      name: board.name as string,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    });
  } catch (error: any) {
    console.error("PATCH /api/boards/[boardId] error:", error);
    return NextResponse.json(
      { error: error.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE board
export async function DELETE(_request: Request, context: RouteContext) {
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
    const boardsCollection = db.collection("boards");

    const result = await boardsCollection.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Board not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/boards/[boardId] error:", error);
    return NextResponse.json(
      { error: error.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
