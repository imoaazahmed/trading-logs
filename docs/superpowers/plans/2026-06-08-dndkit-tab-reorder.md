# @dnd-kit Tab Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the native HTML5 drag-and-drop in `PatchTabs` with @dnd-kit for reliable cross-device drag-to-reorder on the tab bar.

**Architecture:** Extract each visible tab into a `SortablePatchTab` component using `useSortable`. Wrap the tab list in `DndContext` + `SortableContext` with `horizontalListSortingStrategy`. Use `DragOverlay` for a floating clone while dragging. Remove all native HTML5 drag state and event handlers.

**Tech Stack:** @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, React, TypeScript

---

## File Map

| File | Action |
|---|---|
| `components/trades/patch-tabs.tsx` | Modify — sole change target |

---

### Task 1: Replace native drag with @dnd-kit in `PatchTabs`

**Files:**
- Modify: `components/trades/patch-tabs.tsx`

- [ ] **Step 1: Update imports**

Replace the existing import block at the top of `patch-tabs.tsx`. Add @dnd-kit imports and remove the now-unused drag state. Keep all other imports unchanged.

Add these imports after the existing React import:

```tsx
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
```

- [ ] **Step 2: Add the `SortablePatchTab` sub-component**

Add this component above the `PatchTabs` function (but below the type definitions). It takes over the tab rendering including the context menu:

```tsx
type SortablePatchTabProps = {
  patch: Patch
  activePatchId: string
  onTabChange: (id: string) => void
  openRename: (patch: Patch) => void
  openEditLimit: (patch: Patch) => void
  onHidePatch: (id: string) => Promise<void>
  setDeleteTarget: (patch: Patch | null) => void
}

function SortablePatchTab({
  patch,
  activePatchId,
  onTabChange,
  openRename,
  openEditLimit,
  onHidePatch,
  setDeleteTarget,
}: SortablePatchTabProps) {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: patch.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          onClick={() => onTabChange(patch.id)}
          className={cn(
            "flex h-full items-center justify-center border-e border-border/40 px-3",
            "cursor-pointer text-xs font-medium whitespace-nowrap transition-colors select-none",
            patch.id === activePatchId
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            isDragging && "opacity-0"
          )}
        >
          {patch.name}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent side="top">
        <ContextMenuItem onClick={() => openRename(patch)} className="gap-2">
          <Pencil className="size-3.5" />
          {t("trades.patches.rename")}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => openEditLimit(patch)}
          className="gap-2"
        >
          <Hash className="size-3.5" />
          {t("trades.patches.editLimit")}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => onHidePatch(patch.id)}
          className="gap-2"
        >
          <EyeOff className="size-3.5" />
          {t("trades.patches.hide")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={() => setDeleteTarget(patch)}
          variant="destructive"
          className="gap-2"
        >
          <Trash2 className="size-3.5" />
          {t("trades.patches.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
```

- [ ] **Step 3: Update state in `PatchTabs`**

Inside the `PatchTabs` function body, remove:

```tsx
const [draggedId, setDraggedId] = useState<string | null>(null)
const [dragOverId, setDragOverId] = useState<string | null>(null)
```

And remove the four handler functions (`handleDragStart`, `handleDragOver`, `handleDrop`, `handleDragEnd`).

Replace them with:

```tsx
const [activeId, setActiveId] = useState<string | null>(null)
const activePatch = activeId ? patches.find((p) => p.id === activeId) ?? null : null

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
)

function handleDragStart({ active }: DragStartEvent) {
  setActiveId(active.id as string)
}

function handleDragEnd({ active, over }: DragEndEvent) {
  setActiveId(null)
  if (!over || active.id === over.id) return
  const from = visibleIds.indexOf(active.id as string)
  const to = visibleIds.indexOf(over.id as string)
  if (from === -1 || to === -1) return
  const next = arrayMove(visibleIds, from, to)
  setVisibleIds(next)
  onReorder([...next, ...hiddenPatches.map((p) => p.id)])
}
```

- [ ] **Step 4: Update the JSX — wrap tabs in DndContext + SortableContext**

Find the "Visible tabs" section in the return JSX (currently maps `visiblePatches` with native drag props). Replace the entire block — from the comment to the closing of the last `</ContextMenu>` — with:

```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={visibleIds}
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
      />
    ))}
  </SortableContext>
  <DragOverlay dropAnimation={null}>
    {activePatch && (
      <button
        className={cn(
          "flex h-9 items-center justify-center border-e border-border/40 px-3",
          "cursor-grabbing text-xs font-medium whitespace-nowrap select-none shadow-md",
          activePatch.id === activePatchId
            ? "bg-muted text-foreground"
            : "text-muted-foreground bg-muted/50"
        )}
      >
        {activePatch.name}
      </button>
    )}
  </DragOverlay>
</DndContext>
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. If there are type errors in `patch-tabs.tsx`, fix them before continuing.

- [ ] **Step 6: Manual smoke test**

Start the dev server (`npm run dev`) and verify:
1. Tabs render correctly
2. Clicking a tab still activates it
3. Dragging a tab reorders it (drag at least 5px to trigger)
4. Right-click context menu still works on each tab
5. The floating overlay appears while dragging
6. After dropping, `onReorder` fires (check network tab or console)
7. Hidden tabs remain hidden; show/hide still works
