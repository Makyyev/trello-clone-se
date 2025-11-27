// app/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Board = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type ConfirmState = {
  open: boolean;
  message: string;
  onConfirm: (() => void) | null;
};

export default function HomePage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [newBoardName, setNewBoardName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingValue, setRenamingValue] = useState("");

  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    message: "",
    onConfirm: null,
  });

  function openConfirm(message: string, onConfirm: () => void) {
    setConfirm({ open: true, message, onConfirm });
  }

  function closeConfirm() {
    setConfirm({ open: false, message: "", onConfirm: null });
  }

  async function loadBoards() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/boards");
      if (!res.ok) {
        throw new Error(`Failed to load boards (${res.status})`);
      }

      const data: any[] = await res.json();
      const mapped: Board[] = data.map((b) => ({
        id: b._id?.toString?.() ?? b.id,
        name: b.name,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      }));
      setBoards(mapped);
    } catch (err: any) {
      console.error("Error loading boards:", err);
      setError(err.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoards();
  }, []);

  async function handleCreateBoard() {
    const name = newBoardName.trim();
    if (!name) return;

    try {
      setCreating(true);
      setError(null);

      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create board (${res.status})`);
      }

      const created = await res.json();
      const board: Board = {
        id: created._id?.toString?.() ?? created.id,
        name: created.name,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
      };

      setBoards((prev) => [...prev, board]);
      setNewBoardName("");
    } catch (err: any) {
      console.error("Error creating board:", err);
      setError(err.message ?? "Unexpected error");
    } finally {
      setCreating(false);
    }
  }

  function startRenameBoard(board: Board) {
    setRenamingId(board.id);
    setRenamingValue(board.name);
  }

  async function handleRenameBoard(boardId: string, newNameRaw: string) {
    const newName = newNameRaw.trim();
    setRenamingId(null);

    if (!newName) return;

    // optimistic update
    setBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, name: newName } : b))
    );

    try {
      const res = await fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });

      // IMPORTANT: don't use console.error here, or Next dev will show a red overlay
      if (!res.ok) {
        console.warn("Failed to rename board. Status:", res.status);
        // optional: sync back from server if needed
        // await loadBoards();
      }
    } catch (err) {
      console.warn("Network error while renaming board:", err);
    }
  }

  function requestDeleteBoard(boardId: string) {
    openConfirm(
      "Are you sure you want to delete this board and all its lists and cards?",
      async () => {
        closeConfirm();

        try {
          setDeletingId(boardId);
          setError(null);

          const res = await fetch(`/api/boards/${boardId}`, {
            method: "DELETE",
          });

          if (!res.ok) {
            console.error("Failed to delete board. Status:", res.status);
            return;
          }

          setBoards((prev) => prev.filter((b) => b.id !== boardId));
        } catch (err) {
          console.error("Error deleting board:", err);
        } finally {
          setDeletingId(null);
        }
      }
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-semibold">Trello Clone</h1>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="New board name..."
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreateBoard();
                }
              }}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm focus:outline-none focus:ring focus:ring-emerald-500/40"
            />
            <button
              onClick={handleCreateBoard}
              disabled={creating}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-medium hover:bg-emerald-500 disabled:opacity-60"
            >
              {creating ? "Creating..." : "+ New Board"}
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <div className="mb-4 rounded border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            Error: {error}
          </div>
        )}

        {loading ? (
          <div className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            Loading boards...
          </div>
        ) : boards.length === 0 ? (
          <div className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            No boards yet. Create your first board above.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {boards.map((board) => (
              <div
                key={board.id}
                className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 shadow-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  {renamingId === board.id ? (
                    <input
                      autoFocus
                      value={renamingValue}
                      onChange={(e) => setRenamingValue(e.target.value)}
                      onBlur={() =>
                        handleRenameBoard(board.id, renamingValue)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleRenameBoard(board.id, renamingValue);
                        }
                        if (e.key === "Escape") {
                          setRenamingId(null);
                        }
                      }}
                      className="w-full rounded bg-slate-950 px-2 py-1 text-sm border border-slate-700 focus:outline-none focus:ring focus:ring-emerald-500/40"
                    />
                  ) : (
                    <Link href={`/boards/${board.id}`}>
                      <h2 className="text-lg font-semibold text-slate-50 hover:underline">
                        {board.name}
                      </h2>
                    </Link>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startRenameBoard(board)}
                      className="inline-flex items-center justify-center rounded-full p-1 text-slate-400 hover:text-amber-400 hover:bg-amber-950/30 transition"
                      aria-label="Rename board"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => requestDeleteBoard(board.id)}
                      disabled={deletingId === board.id}
                      className="inline-flex items-center justify-center rounded-full p-1 text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition disabled:opacity-50"
                      aria-label="Delete board"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  Created:{" "}
                  {new Date(board.createdAt).toLocaleString("ro-RO", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {confirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-xl">
            <h2 className="mb-2 text-sm font-semibold text-slate-100">
              Confirm delete
            </h2>
            <p className="mb-4 text-xs text-slate-300">{confirm.message}</p>
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={closeConfirm}
                className="rounded-lg border border-slate-600 px-3 py-1 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirm.onConfirm) confirm.onConfirm();
                }}
                className="rounded-lg bg-red-600 px-3 py-1 font-medium hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
