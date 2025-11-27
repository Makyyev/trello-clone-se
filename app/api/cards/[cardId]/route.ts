// app/api/cards/[cardId]/route.ts
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
  params: Promise<{ cardId: string }>;
};

/**
 * PATCH /api/cards/:cardId  -> rename/update card
 * body: { title?: string; description?: string }
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { cardId } = await context.params;
    const cardObjectId = getObjectId(cardId);

    if (!cardObjectId) {
      return NextResponse.json(
        { error: "Invalid card id" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const title = (body.title ?? "").toString().trim();
    const description =
      body.description !== undefined ? String(body.description) : undefined;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const cardsCollection = db.collection("cards");
    const now = new Date();

    const update: any = { title, updatedAt: now };
    if (description !== undefined) {
      update.description = description;
    }

    const res = await cardsCollection.updateOne(
      { _id: cardObjectId },
      { $set: update }
    );

    if (res.matchedCount === 0) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("PATCH /api/cards/[cardId] error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cards/:cardId  -> delete card
 */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { cardId } = await context.params;
    const cardObjectId = getObjectId(cardId);

    if (!cardObjectId) {
      return NextResponse.json(
        { error: "Invalid card id" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const cardsCollection = db.collection("cards");

    const res = await cardsCollection.deleteOne({ _id: cardObjectId });

    if (res.deletedCount === 0) {
      return NextResponse.json(
        { error: "Card not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/cards/[cardId] error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
