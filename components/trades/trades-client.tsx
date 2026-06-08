"use client"

import { useEffect, useState, useTransition } from 'react'
import { useQueryState } from 'nuqs'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { PatchTabs } from './patch-tabs'
import { TradesTable } from './trades-table'
import { TradeDrawer } from './trade-drawer'
import { DeleteTradeDialog } from './delete-trade-dialog'
import { enrichTrades } from '@/lib/trades/calculations'
import {
  createPatch,
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
  const { t } = useTranslation()
  const [patches, setPatches] = useState<Patch[]>(initialPatches)
  const [patchId, setPatchId] = useQueryState('patch', { defaultValue: initialPatchId })
  const [rawTrades, setRawTrades] = useState<RawTrade[]>([])
  const [loadingTrades, setLoadingTrades] = useState(false)
  const [drawer, setDrawer] = useState<DrawerState>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<EnrichedTrade | null>(null)
  const [isPendingPatch, startPatchTransition] = useTransition()

  const activePatchId =
    patches.find((p) => p.id === patchId)?.id ??
    patches.at(-1)?.id ??
    ''

  useEffect(() => {
    if (!activePatchId) return
    setLoadingTrades(true)
    getPatchTrades(activePatchId).then(({ data }) => {
      setRawTrades(data)
      setLoadingTrades(false)
    })
  }, [activePatchId])

  function handleTabChange(id: string) {
    setPatchId(id)
  }

  function handleNewPatch() {
    startPatchTransition(async () => {
      const { data } = await createPatch()
      if (data) {
        setPatches((prev) => [...prev, data])
        setPatchId(data.id)
      }
    })
  }

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
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        {patches.length > 0 && (
          <PatchTabs
            patches={patches}
            activePatchId={activePatchId}
            onTabChange={handleTabChange}
            onNewPatch={handleNewPatch}
            isCreatingPatch={isPendingPatch}
          />
        )}
        <div className="flex items-center gap-3 ms-auto">
          <span className="text-sm text-muted-foreground">
            {t('trades.tradeCount', { count: enriched.length })}
          </span>
          <Button onClick={() => setDrawer({ open: true, mode: 'add' })}>
            {t('trades.addTrade')}
          </Button>
        </div>
      </div>

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
