# Trello Clone – Software Engineering Assignment

This project is a **simplified Trello clone** implemented with **Next.js** and **MongoDB** for the Software Engineering course (assignment 01, “Trello clone”).

The app implements:

- A **collection of boards** (create, rename, delete, open)
- **Lists of cards inside each board** (create, rename, delete)
- **Cards with title + description** (create, edit in a modal, delete)
- **Metrics collection** using Vercel Analytics & Speed Insights
- **Cloud deployment** on Vercel

---

## 1. Features Mapped to Assignment Requirements

### 1.1 Collection of Boards (3p)

On the home page the user sees a **grid of boards**:

- Display all boards from MongoDB.
- Create a new board with a name (input + “New Board” button or Enter).
- Rename a board (inline title editing with a pencil icon).
- Delete a board (trash icon + custom confirmation modal).
- Open a board by clicking on its card.

Each board card shows:

- Board name  
- Creation date/time (`createdAt`)

### 1.2 Lists of Cards (3p)

Inside a board:

- Lists are displayed as **vertical columns**, horizontally scrollable.
- Create a new list (right-side panel “Add new list”).
- Rename a list (pencil icon next to the list title).
- Delete a list (trash icon + confirmation modal, deletes its cards as well).

No drag & drop is implemented, as allowed by the assignment (“no need to be able to re-order lists by dragging and dropping”).

### 1.3 Card Content (3p)

Inside each list:

- Add a new card with just a title (input + “Add card” button or Enter).
- Click a card title to open a **modal window**:
  - View and edit the card **title**.
  - View and edit the card **description** (multi-line textarea).
  - Save changes.
  - Delete the card from inside the modal (with confirmation).
- Cards can also be renamed quickly (pencil icon) and deleted (trash icon) directly in the list.

Other Trello features (drag & drop reordering, comments, images, checklists, etc.) are intentionally not implemented, in line with the simplified specification.

---

## 2. Tech Stack

- **Framework**: [Next.js](https://nextjs.org) (App Router, serverless API routes)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (utility-first styling)
- **Database**: MongoDB Atlas (hosted in the cloud)
- **ORM / Driver**: Official `mongodb` Node.js driver (custom `db.ts` helper)
- **Analytics**:
  - `@vercel/analytics/react`
  - `@vercel/speed-insights/next`
- **Deployment**: [Vercel](https://vercel.com)

---

## 3. Data Model & API

### 3.1 Collections

- `boards`
  - `_id` (ObjectId)
  - `name: string`
  - `createdAt: Date`
  - `updatedAt: Date`

- `lists`
  - `_id` (ObjectId)
  - `boardId: ObjectId` (reference to `boards`)
  - `name: string`
  - `createdAt: Date`
  - `updatedAt: Date`

- `cards`
  - `_id` (ObjectId)
  - `listId: ObjectId` (reference to `lists`)
  - `title: string`
  - `description: string`
  - `createdAt: Date`
  - `updatedAt: Date`

### 3.2 API Routes (Next.js App Router)

- `GET /api/boards` – return all boards
- `POST /api/boards` – create board
- `PATCH /api/boards/:boardId` – rename board
- `DELETE /api/boards/:boardId` – delete board and all its lists & cards

- `GET /api/boards/:boardId/lists` – lists for a board
- `POST /api/boards/:boardId/lists` – create list
- `PATCH /api/lists/:listId` – rename list
- `DELETE /api/lists/:listId` – delete list and its cards

- `GET /api/lists/:listId/cards` – cards for a list
- `POST /api/lists/:listId/cards` – create card
- `PATCH /api/cards/:cardId` – update card (title and/or description)
- `DELETE /api/cards/:cardId` – delete card

All endpoints validate object IDs and return appropriate HTTP codes (`400`, `404`, `500`) on errors.

---

## 4. Running the Project Locally

### 4.1 Prerequisites

- Node.js (LTS)
- npm / yarn / pnpm
- A MongoDB connection string (MongoDB Atlas recommended)

### 4.2 Installation

```bash
# install dependencies
npm install
# or
yarn install
