"use client"

import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { Patch } from '@/lib/trades/types'

type Props = {
  patches: Patch[]
  activePatchId: string
  onTabChange: (patchId: string) => void
  onNewPatch: () => void
  isCreatingPatch: boolean
}

export function PatchTabs({
  patches,
  activePatchId,
  onTabChange,
  onNewPatch,
  isCreatingPatch,
}: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-2">
      <Tabs value={activePatchId} onValueChange={onTabChange}>
        <TabsList>
          {patches.map((patch) => (
            <TabsTrigger key={patch.id} value={patch.id}>
              {t('trades.patchLabel', { count: patch.patch_number * 100 })}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onNewPatch}
        disabled={isCreatingPatch}
        aria-label={t('trades.newPatch')}
      >
        {isCreatingPatch ? <Spinner className="size-3.5" /> : <Plus className="size-4" />}
      </Button>
    </div>
  )
}
