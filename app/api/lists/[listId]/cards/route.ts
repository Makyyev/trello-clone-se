// app/api/lists/[listId]/cards/route.ts
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

// GET /api/lists/:listId/cards  -> all cards in a list
export async function GET(_request: Request, context: RouteContext) {
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

    const cards = await db
      .collection("cards")
      .find({ listId: listObjectId })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json(cards);
  } catch (err) {
    console.error("Error fetching cards:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/lists/:listId/cards  -> create a new card in a list
export async function POST(request: Request, context: RouteContext) {
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
    const { title, description } = body;

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const now = new Date();

    const insertResult = await db.collection("cards").insertOne({
      title,
      description: description ?? "",
      listId: listObjectId,
      createdAt: now,
      updatedAt: now,
    });

    const card = await db
      .collection("cards")
      .findOne({ _id: insertResult.insertedId });

    return NextResponse.json(card, { status: 201 });
  } catch (err) {
    console.error("Error creating card:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

