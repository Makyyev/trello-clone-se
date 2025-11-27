// app/api/boards/[boardId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ObjectId } from "mongodb";

type RouteContext = {
  params: Promise<{ boardId: string }>;
};

function getObjectId(id: string) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

// GET /api/boards/[boardId]  -> get single board
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  const { boardId } = await context.params;
  const objectId = getObjectId(boardId);

  if (!objectId) {
    return NextResponse.json(
      { error: "Invalid board id" },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const boards = db.collection("boards");

    const board = await boards.findOne({ _id: objectId });

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
  } catch (err: any) {
    console.error("GET /api/boards/[boardId] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH /api/boards/[boardId]  -> rename board
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
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

  try {
    const db = await getDb();
    const boards = db.collection("boards");
    const now = new Date();

    const result = await boards.findOneAndUpdate(
      { _id: objectId },
      { $set: { name, updatedAt: now } },
      { returnDocument: "after" }
    );

    // IMPORTANT: guard both result and result.value
    if (!result || !result.value) {
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
  } catch (err: any) {
    console.error("PATCH /api/boards/[boardId] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/[boardId]  -> delete board + its lists + cards
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  const { boardId } = await context.params;
  const objectId = getObjectId(boardId);

  if (!objectId) {
    return NextResponse.json(
      { error: "Invalid board id" },
      { status: 400 }
    );
  }

  try {
    const db = await getDb();
    const boards = db.collection("boards");
    const lists = db.collection("lists");
    const cards = db.collection("cards");

    // Find lists of this board
    const boardLists = await lists
      .find({ boardId: objectId.toString() })
      .toArray();
    const listIds = boardLists.map((l) => l._id.toString());

    // Delete cards from those lists
    if (listIds.length > 0) {
      await cards.deleteMany({ listId: { $in: listIds } });
    }

    // Delete lists
    await lists.deleteMany({ boardId: objectId.toString() });

    // Delete board
    const result = await boards.deleteOne({ _id: objectId });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Board not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE /api/boards/[boardId] error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
