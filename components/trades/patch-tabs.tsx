"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import {
  Check,
  Eye,
  EyeOff,
  Hash,
  Menu,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import type { Patch } from "@/lib/trades/types"
import {
  patchNameSchema,
  patchLimitSchema,
  patchCreateSchema,
} from "@/lib/schemas/patch"
import type * as yup from "yup"

type PatchDialog =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "rename"; patch: Patch }
  | { open: true; mode: "editLimit"; patch: Patch }

type Props = {
  patches: Patch[]
  activePatchId: string
  onTabChange: (patchId: string) => void
  onNewPatch: (name: string, patchLimit: number) => Promise<void>
  onRenamePatch: (id: string, name: string) => Promise<void>
  onEditLimit: (id: string, patchLimit: number) => Promise<void>
  onDeletePatch: (id: string) => Promise<void>
  onHidePatch: (id: string) => Promise<void>
  onShowPatch: (id: string) => Promise<void>
  onReorder: (orderedIds: string[]) => Promise<void>
}

export function PatchTabs({
  patches,
  activePatchId,
  onTabChange,
  onNewPatch,
  onRenamePatch,
  onEditLimit,
  onDeletePatch,
  onHidePatch,
  onShowPatch,
  onReorder,
}: Props) {
  const { t } = useTranslation()
  const [dialog, setDialog] = useState<PatchDialog>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<Patch | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const schemaRef = useRef<yup.AnyObjectSchema>(patchNameSchema)
  const resolver = useCallback(
    (...args: Parameters<ReturnType<typeof yupResolver>>) =>
      yupResolver(schemaRef.current)(...args),
    []
  )
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver })

  // Local ordering for smooth optimistic drag-and-drop
  const [visibleIds, setVisibleIds] = useState<string[]>(() =>
    patches.filter((p) => !p.is_hidden).map((p) => p.id)
  )
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

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

  function openCreate() {
    schemaRef.current = patchCreateSchema
    reset({ name: "New Patch", patch_limit: "100" })
    setDialog({ open: true, mode: "create" })
  }

  function openRename(patch: Patch) {
    schemaRef.current = patchNameSchema
    reset({ name: patch.name })
    setDialog({ open: true, mode: "rename", patch })
  }

  function openEditLimit(patch: Patch) {
    schemaRef.current = patchLimitSchema
    reset({ patch_limit: String(patch.patch_limit) })
    setDialog({ open: true, mode: "editLimit", patch })
  }

  const onDialogSubmit = handleSubmit(async (data) => {
    if (!dialog.open) return
    if (dialog.mode === "create") {
      await onNewPatch(data.name!, parseInt(data.patch_limit!, 10))
    } else if (dialog.mode === "rename") {
      await onRenamePatch(dialog.patch.id, data.name!)
    } else {
      await onEditLimit(dialog.patch.id, parseInt(data.patch_limit!, 10))
    }
    setDialog({ open: false })
  })

  function handleDragStart(id: string) {
    setDraggedId(id)
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (id !== draggedId) setDragOverId(id)
  }

  function handleDrop(targetId: string) {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      return
    }
    const next = [...visibleIds]
    const from = next.indexOf(draggedId)
    const to = next.indexOf(targetId)
    if (from === -1 || to === -1) return
    next.splice(from, 1)
    next.splice(to, 0, draggedId)
    setVisibleIds(next)
    onReorder([...next, ...hiddenPatches.map((p) => p.id)])
    setDraggedId(null)
    setDragOverId(null)
  }

  function handleDragEnd() {
    setDraggedId(null)
    setDragOverId(null)
  }

  return (
    <>
      <div className="flex h-full items-stretch">
        {/* All-patches menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-full w-9 shrink-0 rounded-none p-0"
            >
              <Menu className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top">
            {patches.map((patch) => (
              <DropdownMenuItem
                key={patch.id}
                onClick={() =>
                  patch.is_hidden
                    ? onShowPatch(patch.id)
                    : onTabChange(patch.id)
                }
                className="gap-2"
              >
                <Check
                  className={cn(
                    "size-3.5 shrink-0",
                    patch.id === activePatchId ? "opacity-100" : "opacity-0"
                  )}
                />
                <span
                  className={cn(patch.is_hidden && "text-muted-foreground")}
                >
                  {patch.name}
                </span>
                {patch.is_hidden && (
                  <Eye className="ms-auto size-3.5 text-muted-foreground" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px shrink-0 self-stretch bg-border" />

        {/* Visible tabs — vertical text, draggable left-right */}
        {visiblePatches.map((patch) => (
          <ContextMenu key={patch.id}>
            <ContextMenuTrigger asChild>
              <button
                draggable
                onDragStart={() => handleDragStart(patch.id)}
                onDragOver={(e) => handleDragOver(e, patch.id)}
                onDrop={() => handleDrop(patch.id)}
                onDragEnd={handleDragEnd}
                onClick={() => onTabChange(patch.id)}
                className={cn(
                  "flex h-full items-center justify-center border-e border-border/40 px-3",
                  "cursor-pointer text-xs font-medium whitespace-nowrap transition-colors select-none",
                  patch.id === activePatchId
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  dragOverId === patch.id &&
                    draggedId !== patch.id &&
                    "bg-primary/10",
                  draggedId === patch.id && "opacity-40"
                )}
              >
                {patch.name}
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent side="top">
              <ContextMenuItem
                onClick={() => openRename(patch)}
                className="gap-2"
              >
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
        ))}

        {/* New patch */}
        <Button
          variant="ghost"
          onClick={openCreate}
          aria-label={t("trades.newPatch")}
          className="h-full w-9 shrink-0 rounded-none border-e border-border/40 p-0"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("trades.patches.deleteConfirmTitle", {
                name: deleteTarget?.name ?? "",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("trades.patches.deleteConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t("trades.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault()
                if (!deleteTarget) return
                setIsDeleting(true)
                await onDeletePatch(deleteTarget.id)
                setIsDeleting(false)
                setDeleteTarget(null)
              }}
              disabled={isDeleting}
              variant="destructive"
            >
              {isDeleting && <Spinner data-icon="inline-start" />}
              {t("trades.patches.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create / Rename / Edit Limit Dialog */}
      <Dialog
        open={dialog.open}
        onOpenChange={(o) => {
          if (!o) {
            reset()
            setDialog({ open: false })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {!dialog.open
                ? null
                : dialog.mode === "create"
                  ? t("trades.patches.newTitle")
                  : dialog.mode === "rename"
                    ? t("trades.patches.renameTitle")
                    : t("trades.patches.editLimitTitle")}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={onDialogSubmit}>
            <div className="space-y-4 py-2">
              {dialog.open && dialog.mode !== "editLimit" && (
                <div className="space-y-1.5">
                  <Label htmlFor="patch-name">
                    {t("trades.patches.nameLabel")}
                  </Label>
                  <Input
                    id="patch-name"
                    {...register("name")}
                    placeholder="New Patch"
                    autoFocus
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">
                      {t(errors.name.message as string)}
                    </p>
                  )}
                </div>
              )}
              {dialog.open &&
                (dialog.mode === "create" || dialog.mode === "editLimit") && (
                  <div className="space-y-1.5">
                    <Label htmlFor="patch-limit">
                      {t("trades.patches.patchLimitLabel")}
                    </Label>
                    <Input
                      id="patch-limit"
                      {...register("patch_limit")}
                      placeholder="100"
                      autoFocus={dialog.mode === "editLimit"}
                    />
                    {errors.patch_limit && (
                      <p className="text-xs text-destructive">
                        {t(errors.patch_limit.message as string)}
                      </p>
                    )}
                  </div>
                )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset()
                  setDialog({ open: false })
                }}
                disabled={isSubmitting}
              >
                {t("trades.cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {dialog.open && dialog.mode === "create"
                  ? t("trades.patches.create")
                  : t("trades.form.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
