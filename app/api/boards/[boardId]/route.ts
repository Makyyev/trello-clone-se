// app/api/boards/[boardId]/route.ts
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

type RouteContext = {
  params: Promise<{ boardId: string }>;
};

// GET /api/boards/:boardId  -> return one board
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { boardId } = await context.params;
    const boardObjectId = getObjectId(boardId);

    if (!boardObjectId) {
      return NextResponse.json(
        { error: "Invalid board id" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const boards = db.collection("boards");

    const board = await boards.findOne({ _id: boardObjectId });

    if (!board) {
      return NextResponse.json(
        { error: "Board not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error("Error fetching board:", error);
    return NextResponse.json(
      { error: "Failed to fetch board" },
      { status: 500 }
    );
  }
}

// PATCH /api/boards/:boardId  -> rename board
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { boardId } = await context.params;
    const boardObjectId = getObjectId(boardId);

    if (!boardObjectId) {
      return NextResponse.json(
        { error: "Invalid board id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const name = (body?.name ?? "").toString().trim();

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const boards = db.collection("boards");

    const result = await boards.findOneAndUpdate(
      { _id: boardObjectId },
      { $set: { name, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result || !result.value) {
      return NextResponse.json(
        { error: "Board not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(result.value);
  } catch (error) {
    console.error("Error renaming board:", error);
    return NextResponse.json(
      { error: "Failed to rename board" },
      { status: 500 }
    );
  }
}

// DELETE /api/boards/:boardId  -> delete board + its lists & cards
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { boardId } = await context.params;
    const boardObjectId = getObjectId(boardId);

    if (!boardObjectId) {
      return NextResponse.json(
        { error: "Invalid board id" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const boards = db.collection("boards");
    const lists = db.collection("lists");
    const cards = db.collection("cards");

    // delete the board itself
    const boardResult = await boards.deleteOne({ _id: boardObjectId });

    if (boardResult.deletedCount === 0) {
      return NextResponse.json(
        { error: "Board not found" },
        { status: 404 }
      );
    }

    // cascade delete lists and cards belonging to this board
    const boardLists = await lists
      .find({ boardId })
      .project<{ _id: ObjectId }>({ _id: 1 })
      .toArray();

    if (boardLists.length > 0) {
      const listIds = boardLists.map((l) => l._id.toString());
      await lists.deleteMany({ boardId });
      await cards.deleteMany({ listId: { $in: listIds } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting board:", error);
    return NextResponse.json(
      { error: "Failed to delete board" },
      { status: 500 }
    );
  }
}
