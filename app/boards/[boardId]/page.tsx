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

  // list editing / deleting
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");
  const [renamingListId, setRenamingListId] = useState<string | null>(null);
  const [creatingList, setCreatingList] = useState(false);
  const [deletingListId, setDeletingListId] = useState<string | null>(null);

  // pretty confirmation modal for lists
  const [confirmListId, setConfirmListId] = useState<string | null>(null);
  const [confirmListName, setConfirmListName] = useState("");

  // card modal (title + description)
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeCardListId, setActiveCardListId] = useState<string | null>(null);
  const [cardTitleInput, setCardTitleInput] = useState("");
  const [cardDescInput, setCardDescInput] = useState("");
  const [savingCard, setSavingCard] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

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
      setError("Failed to create card");
    }
  }

  async function handleCreateList() {
    const name = newListTitle.trim();
    if (!name) return;

    try {
      setCreatingList(true);
      setError(null);

      const res = await fetch(`/api/boards/${boardId}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        throw new Error(`Failed to create list (${res.status})`);
      }

      const created = await res.json();

      const newList: List = {
        id: created._id?.toString?.() ?? created.id,
        boardId,
        name: created.name,
        position: created.position ?? lists.length + 1,
        cards: [],
      };

      setLists((prev) => [...prev, newList]);
      setNewListTitle("");
    } catch (err: any) {
      console.error("Error creating list:", err);
      setError(err.message ?? "Unexpected error");
    } finally {
      setCreatingList(false);
    }
  }

  async function handleRenameList(listId: string, newName: string) {
    const cleaned = newName.trim();
    if (!cleaned) {
      setEditingListId(null);
      setEditingListName("");
      return;
    }

    try {
      setRenamingListId(listId);
      setError(null);

      const res = await fetch(`/api/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: cleaned }),
      });

      if (!res.ok) {
        throw new Error(`Failed to rename list (${res.status})`);
      }

      setLists((prev) =>
        prev.map((l) => (l.id === listId ? { ...l, name: cleaned } : l))
      );
    } catch (err: any) {
      console.error("Error renaming list:", err);
      setError(err.message ?? "Unexpected error");
    } finally {
      setRenamingListId(null);
      setEditingListId(null);
      setEditingListName("");
    }
  }

  async function handleDeleteList(listId: string) {
    try {
      setDeletingListId(listId);
      setError(null);

      const res = await fetch(`/api/lists/${listId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Failed to delete list (${res.status})`);
      }

      setLists((prev) => prev.filter((l) => l.id !== listId));
    } catch (err: any) {
      console.error("Error deleting list:", err);
      setError(err.message ?? "Unexpected error");
    } finally {
      setDeletingListId(null);
      setConfirmListId(null);
      setConfirmListName("");
    }
  }

  // open / close list confirm modal
  function openListConfirm(list: List) {
    setConfirmListId(list.id);
    setConfirmListName(list.name);
  }

  function closeListConfirm() {
    setConfirmListId(null);
    setConfirmListName("");
  }

  // card modal helpers
  function openCardModal(listId: string, card: Card) {
    setActiveCard(card);
    setActiveCardListId(listId);
    setCardTitleInput(card.title);
    setCardDescInput(card.description ?? "");
  }

  function closeCardModal() {
    setActiveCard(null);
    setActiveCardListId(null);
    setCardTitleInput("");
    setCardDescInput("");
  }

  async function handleSaveCard() {
    if (!activeCard || !activeCardListId) return;

    const title = cardTitleInput.trim();
    const description = cardDescInput.trim();

    if (!title) return;

    try {
      setSavingCard(true);
      setError(null);

      const res = await fetch(`/api/cards/${activeCard.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update card (${res.status})`);
      }

      setLists((prev) =>
        prev.map((list) =>
          list.id === activeCardListId
            ? {
                ...list,
                cards: list.cards.map((c) =>
                  c.id === activeCard.id ? { ...c, title, description } : c
                ),
              }
            : list
        )
      );

      closeCardModal();
    } catch (err: any) {
      console.error("Error updating card:", err);
      setError(err.message ?? "Unexpected error");
    } finally {
      setSavingCard(false);
    }
  }

  async function handleDeleteCardFromModal() {
    if (!activeCard || !activeCardListId) return;

    try {
      setDeletingCardId(activeCard.id);
      setError(null);

      const res = await fetch(`/api/cards/${activeCard.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Failed to delete card (${res.status})`);
      }

      setLists((prev) =>
        prev.map((list) =>
          list.id === activeCardListId
            ? {
                ...list,
                cards: list.cards.filter((c) => c.id !== activeCard.id),
              }
            : list
        )
      );

      closeCardModal();
    } catch (err: any) {
      console.error("Error deleting card:", err);
      setError(err.message ?? "Unexpected error");
    } finally {
      setDeletingCardId(null);
    }
  }

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto max-w-6xl flex items-center gap-4 px-4 py-4">
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
            {lists.length === 0 && (
              <div className="rounded border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
                This board has no lists yet.
              </div>
            )}

            {lists.map((list) => (
              <div
                key={list.id}
                className="w-72 flex-shrink-0 rounded-xl border border-slate-800 bg-slate-900 p-3 flex flex-col gap-2"
              >
                {/* List header: name + edit + delete */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {editingListId === list.id ? (
                      <input
                        autoFocus
                        value={editingListName}
                        onChange={(e) => setEditingListName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleRenameList(list.id, editingListName);
                          } else if (e.key === "Escape") {
                            setEditingListId(null);
                            setEditingListName("");
                          }
                        }}
                        onBlur={() =>
                          handleRenameList(list.id, editingListName || list.name)
                        }
                        className="w-full rounded bg-slate-950 px-2 py-1 text-sm border border-slate-700 focus:outline-none focus:ring focus:ring-emerald-500/40"
                      />
                    ) : (
                      <h2 className="truncate text-sm font-semibold">
                        {list.name}
                      </h2>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingListId(list.id);
                        setEditingListName(list.name);
                      }}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs text-slate-400 hover:text-emerald-300 hover:bg-slate-800"
                      aria-label="Rename list"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => openListConfirm(list)}
                      disabled={deletingListId === list.id}
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs text-slate-500 hover:text-red-400 hover:bg-red-950/40 disabled:opacity-50"
                      aria-label="Delete list"
                    >
                      🗑
                    </button>
                  </div>
                </div>

                <span className="text-[10px] text-slate-500">
                  {list.cards.length} cards
                </span>

                <div className="space-y-2 flex-1">
                  {list.cards.map((card) => (
                    <button
                      key={card.id}
                      onClick={() => openCardModal(list.id, card)}
                      className="w-full text-left rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs hover:border-emerald-500/70 hover:bg-slate-900"
                    >
                      <div className="font-medium text-slate-50 truncate">
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
                  <div className="pt-2 border-t border-slate-800 mt-2">
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
                      className="mb-1 w-full rounded bg-slate-950 px-2 py-1 text-[11px] border border-slate-700 focus:outline-none focus:ring focus:ring-emerald-500/40"
                    />
                    <button
                      onClick={() =>
                        handleAddCard(list.id, newCardTitles[list.id] ?? "")
                      }
                      className="w-full rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] font-medium py-1"
                    >
                      + Add card
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Add new list column */}
            <div className="w-72 flex-shrink-0 rounded-xl border border-dashed border-emerald-500/40 bg-slate-900/40 p-3 flex flex-col gap-2">
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
                className="w-full rounded bg-slate-950 px-2 py-1 text-[11px] border border-slate-700 focus:outline-none focus:ring focus:ring-emerald-500/40"
              />
              <button
                onClick={handleCreateList}
                disabled={creatingList}
                className="w-full rounded bg-emerald-600 hover:bg-emerald-500 text-[11px] font-medium py-1 disabled:opacity-60"
              >
                {creatingList ? "Creating..." : "+ Create list"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Confirmation modal for deleting lists */}
      {confirmListId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-50 mb-2">
              Delete list
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Are you sure you want to delete the list{" "}
              <span className="font-semibold text-emerald-300">
                {confirmListName}
              </span>{" "}
              and all its cards? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={closeListConfirm}
                disabled={deletingListId === confirmListId}
                className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteList(confirmListId)}
                disabled={deletingListId === confirmListId}
                className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
              >
                {deletingListId === confirmListId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for viewing / editing card content */}
      {activeCard && activeCardListId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 px-5 py-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-slate-50 mb-3">
              Card details
            </h3>

            <div className="mb-3">
              <label className="mb-1 block text-[11px] text-slate-400">
                Title
              </label>
              <input
                value={cardTitleInput}
                onChange={(e) => setCardTitleInput(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm focus:outline-none focus:ring focus:ring-emerald-500/40"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-[11px] text-slate-400">
                Description
              </label>
              <textarea
                value={cardDescInput}
                onChange={(e) => setCardDescInput(e.target.value)}
                rows={4}
                className="w-full resize-none rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm focus:outline-none focus:ring focus:ring-emerald-500/40"
              />
            </div>

            <div className="flex justify-between gap-2">
              <button
                onClick={handleDeleteCardFromModal}
                disabled={deletingCardId === activeCard.id}
                className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
              >
                {deletingCardId === activeCard.id ? "Deleting..." : "Delete"}
              </button>

              <div className="flex gap-2">
                <button
                  onClick={closeCardModal}
                  disabled={savingCard}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-700 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCard}
                  disabled={savingCard}
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {savingCard ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
