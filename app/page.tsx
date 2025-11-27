"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Board = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export default function Home() {
  const router = useRouter();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const loadBoards = async () => {
      try {
        const res = await fetch("/api/boards");
        if (!res.ok) {
          throw new Error(`Failed to load boards: ${res.status}`);
        }
        const data = (await res.json()) as Board[];
        setBoards(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    loadBoards();
  }, []);

  const handleCreateBoard = async () => {
    const name = window.prompt("Board name:");
    if (!name) return;

    try {
      setCreating(true);
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.error ?? `Failed to create board: ${res.status}`;
        throw new Error(msg);
      }

      const created = (await res.json()) as Board;
      setBoards((prev) => [...prev, created]);
    } catch (err: any) {
      console.error(err);
      window.alert(err.message ?? "Error creating board");
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Simple Trello Clone
            </h1>
            <p className="text-sm text-slate-400">
              Boards are loaded from MongoDB via /api/boards.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreateBoard}
            disabled={creating}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            {creating ? "Creating..." : "+ New Board"}
          </button>
        </header>

        {error && (
          <div className="mb-4 rounded-md border border-red-500/60 bg-red-500/10 px-4 py-2 text-sm text-red-200">
            Error: {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-400">Loading boards...</p>
        ) : boards.length === 0 ? (
          <p className="text-sm text-slate-400">
            No boards yet. Click &quot;New Board&quot; to create one.
          </p>
        ) : (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Boards</h2>
              <span className="text-xs uppercase tracking-wide text-slate-400">
                {boards.length} board{boards.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {boards.map((board) => (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => router.push(`/boards/${board.id}`)}
                  className="flex h-32 flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-left shadow-sm transition hover:border-emerald-500 hover:bg-slate-900"
                >
                  <span className="text-base font-semibold">
                    {board.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    Click to open this board
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
