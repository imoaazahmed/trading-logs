# Patch Tabs Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite patch-tab drag-and-drop reorder, menu ordering, tab activation, and localStorage persistence — removing duplicated ordering state and fixing the spurious activation bug.

**Architecture:** `TradesClient` becomes the single source of truth for patch order (`patches` state sorted by `sort_order`). `PatchTabs` owns only `activeId` (drag overlay) and a `dragOccurred` ref (click suppression). All other ordering/activation flows through props and callbacks.

**Tech Stack:** Next.js App Router, TypeScript, @dnd-kit/sortable, nuqs, localStorage

---

## Files

| File | Action |
|------|--------|
| `components/trades/trades-client.tsx` | Modify — add `activatePatch`, `fallbackPatch`, `LAST_PATCH_KEY`; rewrite `activePatchId`, all patch handlers |
| `components/trades/patch-tabs.tsx` | Modify — remove `visibleIds` state + sync effect; add `dragOccurred` ref; rewrite `handleDragEnd`; fix menu render |

---

## Task 1: `TradesClient` — activation helper, localStorage, `activePatchId`

**Files:**
- Modify: `components/trades/trades-client.tsx`

- [ ] **Step 1: Add `useRef` to the React import and add `LAST_PATCH_KEY`**

Replace the React import line and add the constant just inside the component function body:

```tsx
// line 3 — was: import { useEffect, useState } from 'react'
import { useEffect, useRef, useState } from 'react'
```

Add this constant at the very top of the `TradesClient` function body, before any hooks:

```tsx
const LAST_PATCH_KEY = 'trading-logs:last-patch'
```

- [ ] **Step 2: Change `useQueryState` default and add `activatePatch` helper**

Replace the existing `useQueryState` line (currently `{ defaultValue: initialPatchId }`):

```tsx
// was: const [patchId, setPatchId] = useQueryState('patch', { defaultValue: initialPatchId })
const [patchId, setPatchId] = useQueryState('patch', { defaultValue: '' })
```

Add `activatePatch` immediately after that line:

```tsx
function activatePatch(id: string) {
  setPatchId(id)
  localStorage.setItem(LAST_PATCH_KEY, id)
}
```

- [ ] **Step 3: Rewrite `activePatchId` derivation**

Replace the existing `activePatchId` block (lines 45–49):

```tsx
// was: const activePatchId = patches.find(...)?.id ?? patches.find(...)?.id ?? patches.at(-1)?.id ?? ''
const activePatchId =
  patches.find((p) => p.id === patchId)?.id ??
  patches.filter((p) => !p.is_hidden).at(-1)?.id ??
  ''
```

- [ ] **Step 4: Add mount-only `useEffect` to restore last active patch**

Add this block immediately after the `activePatchId` constant (before the existing `useEffect` that loads trades):

```tsx
// Restore last active patch on mount when URL has no patch param
// eslint-disable-next-line react-hooks/exhaustive-deps
useEffect(() => {
  if (patchId) return
  const saved = localStorage.getItem(LAST_PATCH_KEY)
  const target =
    (saved && patches.find((p) => p.id === saved && !p.is_hidden)?.id) ??
    patches.filter((p) => !p.is_hidden).at(-1)?.id
  if (target) activatePatch(target)
}, [])
```

- [ ] **Step 5: Update `handleNewPatch` to use `activatePatch`**

Replace the `setPatchId(data.id)` call inside `handleNewPatch`:

```tsx
async function handleNewPatch(name: string, patchLimit: number) {
  const { data } = await createPatch(name, patchLimit)
  if (data) {
    setPatches((prev) => [...prev, data])
    activatePatch(data.id)
  }
}
```

- [ ] **Step 6: Verify — open the Trades page, reload, check that the last-active tab is restored**

Navigate to `/trades`. Click a tab. Reload the page. The same tab should be active and `?patch=<id>` should be in the URL.

- [ ] **Step 7: Commit**

```bash
git add components/trades/trades-client.tsx
git commit -m "feat: add activatePatch helper with localStorage persistence"
```

---

## Task 2: `TradesClient` — fallback on delete/hide, show patch, optimistic reorder

**Files:**
- Modify: `components/trades/trades-client.tsx`

- [ ] **Step 1: Add `fallbackPatch` helper function**

Add this module-level function just before the `TradesClient` component definition (outside the component, after all imports):

```tsx
function fallbackPatch(list: Patch[], removedId: string): string {
  const removedIndex = list.findIndex((p) => p.id === removedId)
  for (let i = removedIndex - 1; i >= 0; i--) {
    if (!list[i].is_hidden && list[i].id !== removedId) return list[i].id
  }
  return list.find((p) => p.id !== removedId && !p.is_hidden)?.id ?? ''
}
```

- [ ] **Step 2: Rewrite `handleDeletePatch`**

```tsx
async function handleDeletePatch(id: string) {
  const { error } = await deletePatch(id)
  if (!error) {
    setPatches((prev) => prev.filter((p) => p.id !== id))
    if (activePatchId === id) {
      const next = fallbackPatch(patches, id)
      if (next) activatePatch(next)
    }
  }
}
```

- [ ] **Step 3: Rewrite `handleHidePatch`**

```tsx
async function handleHidePatch(id: string) {
  const { error } = await updatePatch(id, { is_hidden: true })
  if (!error) {
    setPatches((prev) => prev.map((p) => (p.id === id ? { ...p, is_hidden: true } : p)))
    if (activePatchId === id) {
      const next = fallbackPatch(patches, id)
      if (next) activatePatch(next)
    }
  }
}
```

- [ ] **Step 4: Rewrite `handleShowPatch`**

```tsx
async function handleShowPatch(id: string) {
  const { error } = await updatePatch(id, { is_hidden: false })
  if (!error) {
    setPatches((prev) => prev.map((p) => (p.id === id ? { ...p, is_hidden: false } : p)))
    activatePatch(id)
  }
}
```

- [ ] **Step 5: Rewrite `handleReorder`**

```tsx
async function handleReorder(orderedIds: string[]) {
  setPatches((prev) => {
    const map = new Map(prev.map((p) => [p.id, p]))
    return orderedIds.map((id) => map.get(id)).filter((p): p is Patch => !!p)
  })
  await Promise.all(orderedIds.map((id, index) => updatePatch(id, { sort_order: index })))
}
```

- [ ] **Step 6: Verify delete/hide fallback**

1. Have 3+ visible patches. Make P2 active.
2. Delete P2 — P1 (the one before it) should become active.
3. Reload — P1 should still be active.
4. Make P1 active, then hide it — the patch before P1 (none, so first remaining visible) becomes active.

- [ ] **Step 7: Verify show-hidden patch**

1. Hide a patch. It should disappear from tabs.
2. Open the hamburger menu — the hidden patch appears in its sorted position (dimmed, with eye icon).
3. Click it — it reappears in the tab bar at its sort-order position and becomes the active tab.

- [ ] **Step 8: Commit**

```bash
git add components/trades/trades-client.tsx
git commit -m "feat: fallback activation on delete/hide, optimistic reorder in TradesClient"
```

---

## Task 3: `PatchTabs` — remove `visibleIds` state, add `dragOccurred`, rewrite drag logic

**Files:**
- Modify: `components/trades/patch-tabs.tsx`

- [ ] **Step 1: Fix React imports in `patch-tabs.tsx`**

The sync `useEffect` is being removed, and `MutableRefObject` needs to be imported. Replace the React import line:

```tsx
// was: import { useState, useEffect, useCallback, useRef } from "react"
import { useState, useCallback, useRef, type MutableRefObject } from "react"
```

- [ ] **Step 2: Update `SortablePatchTabProps` to accept `dragOccurred` ref**

Replace the type definition for `SortablePatchTabProps`:

```tsx
type SortablePatchTabProps = {
  patch: Patch
  activePatchId: string
  onTabChange: (id: string) => void
  openRename: (patch: Patch) => void
  openEditLimit: (patch: Patch) => void
  onHidePatch: (id: string) => Promise<void>
  setDeleteTarget: (patch: Patch | null) => void
  dragOccurred: MutableRefObject<boolean>
}
```

- [ ] **Step 3: Update `SortablePatchTab` function signature and button `onClick`**

Add `dragOccurred` to the destructured props and update the button's `onClick`:

```tsx
function SortablePatchTab({
  patch,
  activePatchId,
  onTabChange,
  openRename,
  openEditLimit,
  onHidePatch,
  setDeleteTarget,
  dragOccurred,
}: SortablePatchTabProps) {
```

Replace the `onClick` on the `<button>` inside `SortablePatchTab`:

```tsx
onClick={() => {
  if (dragOccurred.current) {
    dragOccurred.current = false
    return
  }
  onTabChange(patch.id)
}}
```

- [ ] **Step 4: Remove `visibleIds` state and its sync `useEffect` from `PatchTabs`**

Delete these lines entirely from `PatchTabs` (they are currently around lines 215–233):

```tsx
// DELETE these lines:
const [visibleIds, setVisibleIds] = useState<string[]>(() =>
  patches.filter((p) => !p.is_hidden).map((p) => p.id)
)

// Sync when patches change externally (new patch added, hide/show)
useEffect(() => {
  setVisibleIds((prev) => {
    const newVisible = patches.filter((p) => !p.is_hidden).map((p) => p.id)
    const kept = prev.filter((id) => newVisible.includes(id))
    const added = newVisible.filter((id) => !prev.includes(id))
    return [...kept, ...added]
  })
}, [patches])

const visiblePatches = visibleIds
  .map((id) => patches.find((p) => p.id === id))
  .filter(Boolean) as Patch[]

const hiddenPatches = patches.filter((p) => p.is_hidden)
```

Replace with:

```tsx
const dragOccurred = useRef(false)
const visiblePatches = patches.filter((p) => !p.is_hidden)
```

- [ ] **Step 5: Rewrite `handleDragStart` and `handleDragEnd`**

Replace both callbacks:

```tsx
const handleDragStart = useCallback(({ active }: DragStartEvent) => {
  dragOccurred.current = false
  setActiveId(String(active.id))
}, [])

const handleDragEnd = useCallback(({ active, over }: DragEndEvent) => {
  dragOccurred.current = true
  setTimeout(() => { dragOccurred.current = false }, 0)
  setActiveId(null)
  if (!over || active.id === over.id) return
  const visible = patches.filter((p) => !p.is_hidden)
  const visibleIds = visible.map((p) => p.id)
  const from = visibleIds.indexOf(String(active.id))
  const to = visibleIds.indexOf(String(over.id))
  if (from === -1 || to === -1) return
  const newVisibleIds = arrayMove(visibleIds, from, to)
  // Interleave hidden patches back at their original positions
  const allIds: string[] = []
  let vi = 0
  for (const p of patches) {
    allIds.push(p.is_hidden ? p.id : newVisibleIds[vi++])
  }
  onReorder(allIds)
}, [patches, onReorder])
```

- [ ] **Step 6: Update `SortableContext items` and each `SortablePatchTab` call**

In the JSX, `SortableContext` still needs `visibleIds`. Derive it inline:

```tsx
<SortableContext
  items={visiblePatches.map((p) => p.id)}
  strategy={horizontalListSortingStrategy}
>
  {visiblePatches.map((patch) => (
    <SortablePatchTab
      key={patch.id}
      patch={patch}
      activePatchId={activePatchId}
      onTabChange={onTabChange}
      openRename={openRename}
      openEditLimit={openEditLimit}
      onHidePatch={onHidePatch}
      setDeleteTarget={setDeleteTarget}
      dragOccurred={dragOccurred}
    />
  ))}
</SortableContext>
```

- [ ] **Step 7: Verify — drag a tab**

1. Click a tab to make it active.
2. Drag a different tab to a new position.
3. The previously-active tab should remain active (no spurious switch).
4. The dragged tab should land at the new position.

- [ ] **Step 8: Commit**

```bash
git add components/trades/patch-tabs.tsx
git commit -m "feat: remove visibleIds state, add dragOccurred ref, rewrite handleDragEnd"
```

---

## Task 4: `PatchTabs` — fix menu render

**Files:**
- Modify: `components/trades/patch-tabs.tsx`

- [ ] **Step 1: Update the `DropdownMenuContent` to render `patches` in order (no visible/hidden split)**

Replace the entire `DropdownMenuContent` block:

```tsx
<DropdownMenuContent align="start" side="top">
  {patches.map((patch) => (
    <DropdownMenuItem
      key={patch.id}
      onClick={() =>
        patch.is_hidden ? onShowPatch(patch.id) : onTabChange(patch.id)
      }
      className="gap-2"
    >
      <Check
        className={cn(
          "size-3.5 shrink-0",
          patch.id === activePatchId ? "opacity-100" : "opacity-0"
        )}
      />
      <span className={cn(patch.is_hidden && "text-muted-foreground")}>
        {patch.name}
      </span>
      {patch.is_hidden && (
        <Eye className="ms-auto size-3.5 text-muted-foreground" />
      )}
    </DropdownMenuItem>
  ))}
</DropdownMenuContent>
```

- [ ] **Step 2: Verify — menu ordering matches tab ordering after drag**

1. Drag tabs into a new order: e.g., move tab C before tab A → bar shows C, A, B.
2. Open the hamburger menu. It should show: C, A, B (same order).
3. Hide tab A. Menu should show: C, A (dimmed), B.
4. Click A in the menu. Tab bar should show: C, A, B — with A active at its sort-order position.

- [ ] **Step 3: Commit**

```bash
git add components/trades/patch-tabs.tsx
git commit -m "feat: menu renders all patches in sort order with no visible/hidden split"
```
