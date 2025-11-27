// app/api/lists/[listId]/route.ts
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
type RouteContext = {
  params: Promise<{ listId: string }>;
};

/**
 * PATCH /api/lists/:listId  -> rename list
 * body: { name: string }
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { listId } = await context.params;
    const listObjectId = getObjectId(listId);

    if (!listObjectId) {
      return NextResponse.json(
        { error: "Invalid list id" },
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
    const now = new Date();

    const updateRes = await listsCollection.updateOne(
      { _id: listObjectId },
      { $set: { name, updatedAt: now } }
    );

    if (updateRes.matchedCount === 0) {
      return NextResponse.json(
        { error: "List not found" },
        { status: 404 }
      );
    }

    // Frontend only checks res.ok, so a simple ok flag is enough.
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PATCH /api/lists/[listId] error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lists/:listId  -> delete list and its cards
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { listId } = await context.params;
    const listObjectId = getObjectId(listId);

    if (!listObjectId) {
      return NextResponse.json(
        { error: "Invalid list id" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const listsCollection = db.collection("lists");
    const cardsCollection = db.collection("cards");

    const deleteRes = await listsCollection.deleteOne({ _id: listObjectId });

    if (deleteRes.deletedCount === 0) {
      return NextResponse.json(
        { error: "List not found" },
        { status: 404 }
      );
    }

    // Also delete all cards in this list (optional, but nice)
    await cardsCollection.deleteMany({ listId: listObjectId });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/lists/[listId] error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
