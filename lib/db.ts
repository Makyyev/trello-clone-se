// src/lib/db.ts
import clientPromise from "./mongodb";

export async function getDb() {
  const client = await clientPromise;
  const dbName = process.env.MONGODB_DB_NAME || "trello_clone_se";
  return client.db(dbName);
}
