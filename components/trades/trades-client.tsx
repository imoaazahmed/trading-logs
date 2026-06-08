"use client"

import { useEffect, useState } from 'react'
import { useQueryState } from 'nuqs'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { PatchTabs } from './patch-tabs'
import { TradesTable } from './trades-table'
import { TradeDrawer } from './trade-drawer'
import { DeleteTradeDialog } from './delete-trade-dialog'
import { enrichTrades } from '@/lib/trades/calculations'
import {
  createPatch,
  updatePatch,
  deletePatch,
  getPatchTrades,
  addTrade,
  updateTrade,
  deleteTrade,
} from '@/lib/trades/actions'
import type { Patch, RawTrade, EnrichedTrade, TradeFormData } from '@/lib/trades/types'
import type { TradeSchema } from '@/lib/schemas/trade'

type DrawerState =
  | { open: false }
  | { open: true; mode: 'add' }
  | { open: true; mode: 'edit'; trade: EnrichedTrade }

type Props = {
  patches: Patch[]
  initialPatchId: string
}

export function TradesClient({ patches: initialPatches, initialPatchId }: Props) {
  const LAST_PATCH_KEY = 'trading-logs:last-patch'
  const { t } = useTranslation()
  const [patches, setPatches] = useState<Patch[]>(initialPatches)
  const [patchId, setPatchId] = useQueryState('patch', { defaultValue: '' })

  function activatePatch(id: string) {
    setPatchId(id)
    localStorage.setItem(LAST_PATCH_KEY, id)
  }
  const [rawTrades, setRawTrades] = useState<RawTrade[]>([])
  const [loadingTrades, setLoadingTrades] = useState(false)
  const [drawer, setDrawer] = useState<DrawerState>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<EnrichedTrade | null>(null)

  const activePatchId =
    patches.find((p) => p.id === patchId)?.id ??
    patches.filter((p) => !p.is_hidden).at(-1)?.id ??
    ''

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
    if (!error) setPatches((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
  }

  async function handleEditLimit(id: string, patchLimit: number) {
    const { error } = await updatePatch(id, { patch_limit: patchLimit })
    if (!error) setPatches((prev) => prev.map((p) => (p.id === id ? { ...p, patch_limit: patchLimit } : p)))
  }

  async function handleDeletePatch(id: string) {
    const { error } = await deletePatch(id)
    if (!error) {
      const remaining = patches.filter((p) => p.id !== id)
      setPatches(remaining)
      if (activePatchId === id) {
        const next = remaining.find((p) => !p.is_hidden) ?? remaining[0]
        if (next) setPatchId(next.id)
      }
    }
  }

  async function handleHidePatch(id: string) {
    const { error } = await updatePatch(id, { is_hidden: true })
    if (!error) {
      setPatches((prev) => prev.map((p) => (p.id === id ? { ...p, is_hidden: true } : p)))
      if (activePatchId === id) {
        const next = patches.find((p) => p.id !== id && !p.is_hidden)
        if (next) setPatchId(next.id)
      }
    }
  }

  async function handleShowPatch(id: string) {
    const { error } = await updatePatch(id, { is_hidden: false })
    if (!error)
      setPatches((prev) => prev.map((p) => (p.id === id ? { ...p, is_hidden: false } : p)))
  }

  async function handleReorder(orderedIds: string[]) {
    // Optimistic — local state already updated by PatchTabs
    await Promise.all(orderedIds.map((id, index) => updatePatch(id, { sort_order: index })))
  }

  // Trade handlers
  async function handleSave(data: TradeSchema): Promise<string | null> {
    const formData = data as TradeFormData
    let result: { error: string | null }
    if (drawer.open && drawer.mode === 'edit') {
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 py-2 border-b">
        <Button className="ms-auto" onClick={() => setDrawer({ open: true, mode: 'add' })}>
          <Plus className="size-4" />
          {t('trades.addTrade')}
        </Button>
      </div>

      <div className="flex-1 overflow-auto">
        {loadingTrades ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
            <Spinner />
          </div>
        ) : (
          <TradesTable
            trades={enriched}
            onEdit={(trade) => setDrawer({ open: true, mode: 'edit', trade })}
            onDelete={(trade) => setDeleteTarget(trade)}
          />
        )}
      </div>

      {patches.length > 0 && (
        <div className="h-9 border-t shrink-0 bg-background">
          <PatchTabs
            patches={patches}
            activePatchId={activePatchId}
            onTabChange={(id) => setPatchId(id)}
            onNewPatch={handleNewPatch}
            onRenamePatch={handleRenamePatch}
            onEditLimit={handleEditLimit}
            onDeletePatch={handleDeletePatch}
            onHidePatch={handleHidePatch}
            onShowPatch={handleShowPatch}
            onReorder={handleReorder}
          />
        </div>
      )}

      <TradeDrawer
        open={drawer.open}
        initialData={drawer.open && drawer.mode === 'edit' ? drawer.trade : undefined}
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
