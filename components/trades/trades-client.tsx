"use client"

import { useEffect, useRef, useState } from "react"
import { useQueryState } from "nuqs"
import { useTranslation } from "react-i18next"
import { ChartCandlestick, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PatchTabs, type PatchTabsHandle } from "./patch-tabs"
import { TradesTable } from "./trades-table"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
  EmptyContent,
} from "@/components/ui/empty"
import { TradeDrawer } from "./trade-drawer"
import { DeleteTradeDialog } from "./delete-trade-dialog"
import { enrichTrades } from "@/lib/trades/calculations"
import {
  createPatch,
  updatePatch,
  deletePatch,
  duplicatePatch,
  getPatchTrades,
  addTrade,
  updateTrade,
  deleteTrade,
} from "@/lib/trades/actions"
import type {
  Patch,
  RawTrade,
  EnrichedTrade,
  TradeFormData,
} from "@/lib/trades/types"
import type { TradeSchema } from "@/lib/schemas/trade"

type DrawerState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; trade: EnrichedTrade }

type Props = {
  patches: Patch[]
}

const LAST_PATCH_KEY = "trading-logs:last-patch"

function fallbackPatch(list: Patch[], removedId: string): string {
  const removedIndex = list.findIndex((p) => p.id === removedId)
  for (let i = removedIndex - 1; i >= 0; i--) {
    if (!list[i].is_hidden) return list[i].id
  }
  return list.find((p) => p.id !== removedId && !p.is_hidden)?.id ?? ""
}

export function TradesClient({ patches: initialPatches }: Props) {
  const { t } = useTranslation()
  const [patches, setPatches] = useState<Patch[]>(initialPatches)
  const [patchId, setPatchId] = useQueryState("patch", { defaultValue: "" })

  // Initialized from localStorage on the client (SSR-safe: returns '' on server).
  // This makes activePatchId correct on the very first client render without
  // relying on a useEffect + nuqs URL update, which is unreliable during
  // Next.js client-side navigation transitions.
  const [localPatchId, setLocalPatchId] = useState<string>(() => {
    if (typeof window === "undefined") return ""
    try {
      return localStorage.getItem(LAST_PATCH_KEY) ?? ""
    } catch {
      return ""
    }
  })

  function activatePatch(id: string) {
    setLocalPatchId(id)
    setPatchId(id)
    localStorage.setItem(LAST_PATCH_KEY, id)
  }

  const patchTabsRef = useRef<PatchTabsHandle>(null)
  const [rawTrades, setRawTrades] = useState<RawTrade[]>([])
  const [loadingTrades, setLoadingTrades] = useState(false)
  const [drawer, setDrawer] = useState<DrawerState>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<EnrichedTrade | null>(null)

  // URL param (patchId) takes priority; then localStorage (localPatchId); then last visible.
  const activePatchId =
    patches.find((p) => p.id === patchId && !p.is_hidden)?.id ??
    patches.find((p) => p.id === localPatchId && !p.is_hidden)?.id ??
    patches.filter((p) => !p.is_hidden).at(-1)?.id ??
    ""

  // Sync URL on mount. Deferred to the next macrotask so the Next.js navigation
  // transition has fully settled before nuqs tries to push a URL update
  // (calling setPatchId during an active transition gets silently dropped).
  // Also clears a stale patch param when there are no valid patches.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const target = activePatchId
    const timer = setTimeout(() => setPatchId(target || null), 0)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!activePatchId) return
    setLoadingTrades(true)
    getPatchTrades(activePatchId).then(({ data }) => {
      setRawTrades(data)
      setLoadingTrades(false)
    })
  }, [activePatchId])

  // Patch handlers
  async function handleNewPatch(name: string, patchLimit: number) {
    const { data } = await createPatch(name, patchLimit)
    if (data) {
      setPatches((prev) => [...prev, data])
      activatePatch(data.id)
    }
  }

  async function handleRenamePatch(id: string, name: string) {
    const { error } = await updatePatch(id, { name })
    if (!error)
      setPatches((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  async function handleEditLimit(id: string, patchLimit: number) {
    const { error } = await updatePatch(id, { patch_limit: patchLimit })
    if (!error)
      setPatches((prev) =>
        prev.map((p) => (p.id === id ? { ...p, patch_limit: patchLimit } : p))
      )
  }

  async function handleDuplicatePatch(id: string) {
    const { data } = await duplicatePatch(id)
    if (data) {
      setPatches((prev) => [...prev, data])
      activatePatch(data.id)
    }
  }

  async function handleDeletePatch(id: string) {
    const { error } = await deletePatch(id)
    if (!error) {
      const next = activePatchId === id ? fallbackPatch(patches, id) : null
      setPatches((prev) => prev.filter((p) => p.id !== id))
      if (next) activatePatch(next)
    }
  }

  async function handleHidePatch(id: string) {
    const { error } = await updatePatch(id, { is_hidden: true })
    if (!error) {
      const next = activePatchId === id ? fallbackPatch(patches, id) : null
      setPatches((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_hidden: true } : p))
      )
      if (next) activatePatch(next)
    }
  }

  async function handleShowPatch(id: string) {
    const { error } = await updatePatch(id, { is_hidden: false })
    if (!error) {
      setPatches((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_hidden: false } : p))
      )
      activatePatch(id)
    }
  }

  async function handleReorder(orderedIds: string[]) {
    setPatches((prev) => {
      const map = new Map(prev.map((p) => [p.id, p]))
      return orderedIds.map((id) => map.get(id)).filter((p): p is Patch => !!p)
    })
    await Promise.all(
      orderedIds.map((id, index) => updatePatch(id, { sort_order: index }))
    )
  }

  // Trade handlers
  async function handleSave(data: TradeSchema): Promise<string | null> {
    const formData = data as TradeFormData
    let result: { error: string | null }
    if (drawer.open && drawer.mode === "edit") {
      result = await updateTrade(drawer.trade.id, formData)
    } else {
      result = await addTrade(activePatchId, formData)
    }
    if (result.error) return result.error
    const { data: fresh } = await getPatchTrades(activePatchId)
    setRawTrades(fresh)
    setDrawer({ open: false })
    return null
  }

  async function handleDeleteConfirm(tradeId: string) {
    await deleteTrade(tradeId)
    const { data: fresh } = await getPatchTrades(activePatchId)
    setRawTrades(fresh)
    setDeleteTarget(null)
  }

  const enriched = enrichTrades(rawTrades)
  const allHidden = patches.length > 0 && patches.every((p) => p.is_hidden)
  const noPatches = patches.length === 0

  return (
    <div className="flex h-full flex-col">
      {!noPatches && !allHidden && (
        <div className="flex items-center border-b px-4 py-2">
          <Button
            className="ms-auto"
            onClick={() => setDrawer({ open: true, mode: "add" })}
          >
            <Plus className="size-4" />
            {t("trades.addTrade")}
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1">
        {noPatches || allHidden ? (
          <div className="flex h-full items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia
                  variant="icon"
                  className="bg-foreground/10 text-foreground"
                >
                  <ChartCandlestick />
                </EmptyMedia>
                <EmptyTitle>
                  {noPatches
                    ? t("trades.patches.emptyTitle")
                    : t("trades.patches.allHiddenTitle")}
                </EmptyTitle>
                <EmptyDescription>
                  {noPatches
                    ? t("trades.patches.emptyBody")
                    : t("trades.patches.allHiddenBody")}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => patchTabsRef.current?.openCreate()}>
                  <Plus className="size-4" />
                  {t("trades.patches.createPatch")}
                </Button>
              </EmptyContent>
            </Empty>
          </div>
        ) : loadingTrades ? (
          <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground">
            <Spinner />
          </div>
        ) : (
          <TradesTable
            trades={enriched}
            onEdit={(trade) => setDrawer({ open: true, mode: "edit", trade })}
            onDelete={(trade) => setDeleteTarget(trade)}
          />
        )}
      </ScrollArea>

      <div className="h-9 shrink-0 border-t bg-background">
        <PatchTabs
          ref={patchTabsRef}
          patches={patches}
          activePatchId={activePatchId}
          onTabChange={activatePatch}
          onNewPatch={handleNewPatch}
          onRenamePatch={handleRenamePatch}
          onEditLimit={handleEditLimit}
          onDuplicatePatch={handleDuplicatePatch}
          onDeletePatch={handleDeletePatch}
          onHidePatch={handleHidePatch}
          onShowPatch={handleShowPatch}
          onReorder={handleReorder}
        />
      </div>

      <TradeDrawer
        open={drawer.open}
        initialData={
          drawer.open && drawer.mode === "edit" ? drawer.trade : undefined
        }
        onClose={() => setDrawer({ open: false })}
        onSave={handleSave}
      />

      <DeleteTradeDialog
        trade={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
