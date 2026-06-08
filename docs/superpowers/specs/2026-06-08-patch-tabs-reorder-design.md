# Patch Tabs Reorder — Design Spec

**Date:** 2026-06-08
**Scope:** Rewrite drag-and-drop reorder logic, menu ordering, tab activation, and localStorage persistence in `PatchTabs` + `TradesClient`.

---

## Problem

The current implementation has several issues:
- After drag-and-drop, the last tab gets spuriously activated (click fires after drag due to Radix `ContextMenuTrigger` interfering with dnd-kit's click suppression)
- Local `visibleIds` state in `PatchTabs` duplicates ordering state already owned by `TradesClient`
- Menu ordering was using the raw `patches` prop (before recent partial fix)
- No localStorage persistence for last active tab
- Delete/hide fallback activated "first visible" rather than the patch immediately before the removed one

---

## Goals

1. Drag reorders tabs; only click activates a tab
2. Menu shows all patches (visible + hidden) in current sort order
3. Clicking a hidden patch in the menu un-hides it, restores it to its sort-order position, and activates it
4. Active tab persists across page loads via localStorage + URL query param
5. Delete/hide fallback activates the patch immediately before the removed one (or the new first if it was first)
6. Clean single source of truth for patch order

---

## State Ownership

### `TradesClient`

- `patches: Patch[]` — sorted by `sort_order`, single source of truth for both data and order
- `patchId` via `useQueryState('patch', { defaultValue: '' })` — active patch ID in URL
- `LAST_PATCH_KEY = 'trading-logs:last-patch'` in localStorage

**`activePatchId` derivation (in order of priority):**
1. `patchId` from URL, if it matches a patch in `patches`
2. The localStorage value (`LAST_PATCH_KEY`), if it matches a patch in `patches`
3. The last visible (non-hidden) patch in `patches`
4. `''` (empty string) as absolute fallback

**`activatePatch(id: string)`** — single helper used everywhere tab activation occurs:
```ts
function activatePatch(id: string) {
  setPatchId(id)
  localStorage.setItem(LAST_PATCH_KEY, id)
}
```

### `PatchTabs`

- `activeId: string | null` — ID of the currently dragging tab (for DragOverlay only)
- `dragOccurred: MutableRefObject<boolean>` — prevents click-after-drag activation

No ordering state. Order is derived directly from the `patches` prop.

---

## Derived Values in `PatchTabs`

```ts
const visiblePatches = patches.filter((p) => !p.is_hidden)
const allPatches = patches  // already sorted by sort_order
```

These replace the old `visibleIds` / `visiblePatches` / `hiddenPatches` triple.

---

## Drag-and-Drop Reorder

### `PatchTabs.handleDragEnd`

1. Set `dragOccurred.current = true`
2. Clear `activeId`
3. If `!over || active.id === over.id` → return early
4. Compute `visibleIds = visiblePatches.map(p => p.id)`
5. `from = visibleIds.indexOf(active.id)`, `to = visibleIds.indexOf(over.id)`
6. If either is `-1` → return early
7. `newVisibleIds = arrayMove(visibleIds, from, to)`
8. Build `allIds` by walking the original `patches` array and replacing each visible entry's slot with the next entry from `newVisibleIds`, while hidden entries stay in-place:
   ```ts
   const allIds: string[] = []
   let vi = 0
   for (const p of patches) {
     if (!p.is_hidden) {
       allIds.push(newVisibleIds[vi++])
     } else {
       allIds.push(p.id)
     }
   }
   ```
9. Call `onReorder(allIds)`

### `TradesClient.handleReorder(orderedIds: string[])`

1. **Optimistic update**: reorder `patches` state immediately to match `orderedIds`
2. **Persist**: `Promise.all(orderedIds.map((id, i) => updatePatch(id, { sort_order: i })))` (fire-and-forget — no `await` block on UI)

---

## Click vs Drag Separation

`dragOccurred` ref lives in `PatchTabs` and is passed to each `SortablePatchTab` via prop.

In `SortablePatchTab.onClick`:
```ts
onClick={() => {
  if (dragOccurred.current) {
    dragOccurred.current = false
    return
  }
  onTabChange(patch.id)
}}
```

`dragOccurred.current` is set to `true` in `handleDragEnd` (step 1) before any state updates, and reset in the first click handler that fires after the drag.

---

## Menu (DropdownMenu)

Renders `patches` (all, in sort order) — no split between visible and hidden.

```tsx
{patches.map((patch) => (
  <DropdownMenuItem
    key={patch.id}
    onClick={() =>
      patch.is_hidden ? onShowPatch(patch.id) : onTabChange(patch.id)
    }
  >
    <Check className={patch.id === activePatchId ? 'opacity-100' : 'opacity-0'} />
    <span className={patch.is_hidden ? 'text-muted-foreground' : undefined}>
      {patch.name}
    </span>
    {patch.is_hidden && <Eye className="ms-auto" />}
  </DropdownMenuItem>
))}
```

---

## Showing a Hidden Patch

`TradesClient.handleShowPatch(id: string)`:
1. Call `updatePatch(id, { is_hidden: false })`
2. On success: `setPatches(prev => prev.map(p => p.id === id ? { ...p, is_hidden: false } : p))`
3. `activatePatch(id)`

The patch keeps its `sort_order` untouched, so it naturally slots back into its original position in the tab bar (since visible tabs are rendered in `sort_order` sequence).

---

## Delete / Hide Fallback

When the currently active patch is deleted or hidden, activate the patch immediately before it in the sorted list. If it was the first patch, activate the new first visible patch.

```ts
function fallbackPatch(patches: Patch[], removedId: string): string {
  const visible = patches.filter((p) => !p.is_hidden && p.id !== removedId)
  const removedIndex = patches.findIndex((p) => p.id === removedId)
  // Walk backward from removedIndex to find the nearest visible patch before it
  for (let i = removedIndex - 1; i >= 0; i--) {
    if (!patches[i].is_hidden && patches[i].id !== removedId) return patches[i].id
  }
  // Fallback: first remaining visible patch
  return visible[0]?.id ?? ''
}
```

Used in `handleDeletePatch` and `handleHidePatch` when `activePatchId === id`.

---

## Init / URL / localStorage Flow

`localStorage` must not be accessed in the render path (SSR throws). All reads happen in a mount-only `useEffect`.

```
Page loads with ?patch=xyz  →  nuqs sets patchId = 'xyz'
                             →  activePatchId = 'xyz' (if valid patch)
                             →  no localStorage read needed

Page loads without ?patch=  →  patchId = '' (nuqs default)
                             →  on mount: useEffect reads localStorage
                             →  if saved id is valid → activatePatch(saved id)
                             →  else → activatePatch(last visible patch)
```

```ts
// Mount-only: restore last active patch if URL has none
useEffect(() => {
  if (patchId) return // URL already has a patch — honour it
  const saved = localStorage.getItem(LAST_PATCH_KEY)
  const target =
    (saved && patches.find((p) => p.id === saved && !p.is_hidden)?.id) ??
    patches.filter((p) => !p.is_hidden).at(-1)?.id
  if (target) activatePatch(target)
}, []) // intentionally empty deps — runs once on mount
```

`activatePatch(id)` always writes localStorage AND updates the URL:
```ts
function activatePatch(id: string) {
  setPatchId(id)
  localStorage.setItem(LAST_PATCH_KEY, id)
}
```

---

## Files Changed

| File | Changes |
|------|---------|
| `components/trades/trades-client.tsx` | Add `activatePatch`, `LAST_PATCH_KEY`, `fallbackPatch`; update `activePatchId` derivation; rewrite `handleReorder`, `handleDeletePatch`, `handleHidePatch`, `handleShowPatch` |
| `components/trades/patch-tabs.tsx` | Remove `visibleIds` state + sync `useEffect`; add `dragOccurred` ref; rewrite `handleDragEnd`; update menu render; update `onTabChange` call in tab button |

No new files. No schema changes. No other components affected.
