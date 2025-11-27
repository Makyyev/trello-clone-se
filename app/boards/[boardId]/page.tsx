// app/boards/[boardId]/page.tsx
"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

type Board = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

type Card = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
};

type List = {
  id: string;
  boardId: string;
  name: string;
  position: number;
  cards: Card[];
};

type PageProps = {
  params: Promise<{ boardId: string }>;
};

// helper to normalize API card objects
function normalizeCard(apiCard: any): Card {
  return {
    id: apiCard._id?.toString() ?? apiCard.id,
    title: apiCard.title ?? "",
    description: apiCard.description ?? "",
    createdAt:
      typeof apiCard.createdAt === "string"
        ? apiCard.createdAt
        : new Date().toISOString(),
  };
}

export default function BoardPage({ params }: PageProps) {
  const { boardId } = use(params);

  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [newCardTitles, setNewCardTitles] = useState<Record<string, string>>({});
  const [newListTitle, setNewListTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // card modal state
  const [selectedCard, setSelectedCard] = useState<{
    listId: string;
    card: Card;
  } | null>(null);
  const [modalTitle, setModalTitle] = useState("");
  const [modalDescription, setModalDescription] = useState("");

  // ---------- CRUD HELPERS ----------

  async function handleCreateList() {
    const name = newListTitle.trim();
    if (!name) return;

    try {
      const res = await fetch(`/api/boards/${boardId}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create list (${res.status})`);
      }

      const created = await res.json();

      setLists((prev) => [
        ...prev,
        {
          id: created.id,
          boardId: created.boardId,
          name: created.name,
          position: created.position,
          cards: [],
        },
      ]);
      setNewListTitle("");
    } catch (err) {
      console.error("Error creating list:", err);
      alert("Could not create list.");
    }
  }

  async function handleRenameList(listId: string) {
    const current = lists.find((l) => l.id === listId);
    const newName = prompt("New list name:", current?.name ?? "");
    if (!newName) return;

    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!res.ok) {
        throw new Error(`Failed to rename list (${res.status})`);
      }

      setLists((prev) =>
        prev.map((l) =>
          l.id === listId ? { ...l, name: newName.trim() } : l
        )
      );
    } catch (err) {
      console.error("Error renaming list:", err);
      alert("Could not rename list.");
    }
  }

  async function handleDeleteList(listId: string) {
    if (!confirm("Delete this list and all its cards?")) return;

    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Failed to delete list (${res.status})`);
      }

      setLists((prev) => prev.filter((l) => l.id !== listId));
    } catch (err) {
      console.error("Error deleting list:", err);
      alert("Could not delete list.");
    }
  }

  async function handleAddCard(listId: string, title: string) {
    const cleaned = title.trim();
    if (!cleaned) return;

    try {
      const res = await fetch(`/api/lists/${listId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: cleaned, description: "" }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create card (${res.status})`);
      }

      const created = await res.json();

      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? {
                ...l,
                cards: [
                  ...l.cards,
                  {
                    id: created._id ?? created.id,
                    title: created.title,
                    description: created.description ?? "",
                    createdAt: created.createdAt,
                  },
                ],
              }
            : l
        )
      );

      setNewCardTitles((prev) => ({ ...prev, [listId]: "" }));
    } catch (err) {
      console.error("Error creating card:", err);
      alert("Could not create card.");
    }
  }

  async function handleDeleteCard(cardId: string, listId: string) {
    if (!confirm("Delete this card?")) return;

    try {
      const res = await fetch(`/api/cards/${cardId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Failed to delete card (${res.status})`);
      }

      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? { ...l, cards: l.cards.filter((c) => c.id !== cardId) }
            : l
        )
      );

      if (selectedCard && selectedCard.card.id === cardId) {
        setSelectedCard(null);
      }
    } catch (err) {
      console.error("Error deleting card:", err);
      alert("Could not delete card.");
    }
  }

  // ---------- CARD MODAL HELPERS ----------

  function openCardModal(listId: string, card: Card) {
    setSelectedCard({ listId, card });
    setModalTitle(card.title);
    setModalDescription(card.description ?? "");
  }

  function closeCardModal() {
    setSelectedCard(null);
  }

  async function handleSaveCardModal() {
    if (!selectedCard) return;
    const { listId, card } = selectedCard;
    const title = modalTitle.trim();
    const description = modalDescription.trim();

    if (!title) {
      alert("Title is required.");
      return;
    }

    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      if (!res.ok) {
        throw new Error(`Failed to rename card (${res.status})`);
      }

      setLists((prev) =>
        prev.map((l) =>
          l.id === listId
            ? {
                ...l,
                cards: l.cards.map((c) =>
                  c.id === card.id ? { ...c, title, description } : c
                ),
              }
            : l
        )
      );

      setSelectedCard(null);
    } catch (err) {
      console.error("Error renaming card:", err);
      alert("Could not update card.");
    }
  }

  async function handleDeleteCardFromModal() {
    if (!selectedCard) return;
    await handleDeleteCard(selectedCard.card.id, selectedCard.listId);
    setSelectedCard(null);
  }

  // ---------- INITIAL LOAD ----------

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [boardRes, listsRes] = await Promise.all([
          fetch(`/api/boards/${boardId}`),
          fetch(`/api/boards/${boardId}/lists`),
        ]);

        if (!boardRes.ok) {
          throw new Error(`Failed to load board (${boardRes.status})`);
        }
        if (!listsRes.ok) {
          throw new Error(`Failed to load lists (${listsRes.status})`);
        }

        const boardData = await boardRes.json();
        const listsData: any[] = await listsRes.json();

        const listsWithCards: List[] = await Promise.all(
          listsData.map(async (l) => {
            const cardsRes = await fetch(`/api/lists/${l.id}/cards`);

            let cards: Card[] = [];
            if (cardsRes.ok) {
              const rawCards: any[] = await cardsRes.json();
              cards = rawCards.map(normalizeCard);
            }

            return {
              id: l.id,
              boardId: l.boardId,
              name: l.name,
              position: l.position,
              cards,
            };
          })
        );

        setBoard({
          id: boardData.id,
          name: boardData.name,
          createdAt: boardData.createdAt,
          updatedAt: boardData.updatedAt,
        });
        setLists(listsWithCards);
      } catch (err: any) {
        console.error("Error loading board page:", err);
        setError(err.message ?? "Unexpected error");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [boardId]);

  // ---------- RENDER ----------

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4">
          <Link
            href="/"
            className="rounded bg-slate-800 px-3 py-1 text-sm hover:bg-slate-700"
          >
            ← Back to boards
          </Link>

          <div className="flex flex-col">
            <span className="text-xs text-slate-400">Board</span>
            <h1 className="text-lg font-semibold">
              {board ? board.name : "Loading..."}
            </h1>
          </div>

          <div className="ml-auto text-xs text-slate-400">
            Add more lists on the right, and cards inside each list.
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">
        {loading && (
          <div className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
            Loading board data...
          </div>
        )}

        {error && (
          <div className="mb-4 rounded border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-200">
            Error: {error}
          </div>
        )}

        {!loading && !error && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {/* Existing lists */}
            {lists.map((list) => (
              <div
                key={list.id}
                className="flex w-72 flex-shrink-0 flex-col gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold">{list.name}</h2>
                  <div className="flex gap-1 text-xs">
                    <button
                      onClick={() => handleRenameList(list.id)}
                      className="rounded bg-slate-800 px-1.5 py-0.5 hover:bg-slate-700"
                      title="Rename list"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDeleteList(list.id)}
                      className="rounded bg-slate-800 px-1.5 py-0.5 hover:bg-red-700"
                      title="Delete list"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <span className="text-[10px] text-slate-500">
                  {list.cards.length} cards
                </span>

                <div className="flex-1 space-y-2">
                  {list.cards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => openCardModal(list.id, card)}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-left text-xs hover:border-emerald-500/80 hover:bg-slate-900"
                    >
                      <div className="font-medium text-slate-50">
                        {card.title}
                      </div>
                      {card.description && (
                        <div className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                          {card.description}
                        </div>
                      )}
                    </button>
                  ))}

                  {list.cards.length === 0 && (
                    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-500">
                      No cards yet in this list.
                    </div>
                  )}

                  {/* New card input */}
                  <div className="mt-2 border-t border-slate-800 pt-2">
                    <input
                      type="text"
                      placeholder="New card title..."
                      value={newCardTitles[list.id] ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewCardTitles((prev) => ({
                          ...prev,
                          [list.id]: value,
                        }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCard(list.id, newCardTitles[list.id] ?? "");
                        }
                      }}
                      className="mb-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] focus:outline-none focus:ring focus:ring-emerald-500/40"
                    />
                    <button
                      onClick={() =>
                        handleAddCard(list.id, newCardTitles[list.id] ?? "")
                      }
                      className="w-full rounded bg-emerald-600 py-1 text-[11px] font-medium hover:bg-emerald-500"
                    >
                      + Add card
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Column to create new list */}
            <div className="flex w-72 flex-shrink-0 flex-col gap-2 rounded-xl border border-dashed border-emerald-500/60 bg-slate-900/40 p-3">
              <h2 className="text-sm font-semibold text-emerald-300">
                Add new list
              </h2>
              <input
                type="text"
                placeholder="List title..."
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateList();
                  }
                }}
                className="mb-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:outline-none focus:ring focus:ring-emerald-500/40"
              />
              <button
                onClick={handleCreateList}
                className="w-full rounded bg-emerald-600 py-1 text-xs font-medium hover:bg-emerald-500"
              >
                + Create list
              </button>
            </div>
          </div>
        )}
      </section>

      {/* CARD MODAL */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">
                Edit card
              </h2>
              <button
                onClick={closeCardModal}
                className="rounded bg-slate-800 px-2 py-0.5 text-xs hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            <label className="mb-2 block text-xs font-medium text-slate-300">
              Title
            </label>
            <input
              type="text"
              value={modalTitle}
              onChange={(e) => setModalTitle(e.target.value)}
              className="mb-3 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:outline-none focus:ring focus:ring-emerald-500/40"
            />

            <label className="mb-2 block text-xs font-medium text-slate-300">
              Description
            </label>
            <textarea
              value={modalDescription}
              onChange={(e) => setModalDescription(e.target.value)}
              rows={4}
              className="mb-4 w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs focus:outline-none focus:ring focus:ring-emerald-500/40"
            />

            <div className="flex justify-between gap-2">
              <button
                onClick={handleDeleteCardFromModal}
                className="rounded bg-red-700 px-3 py-1 text-xs font-medium hover:bg-red-600"
              >
                Delete card
              </button>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={closeCardModal}
                  className="rounded bg-slate-800 px-3 py-1 text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCardModal}
                  className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium hover:bg-emerald-500"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
