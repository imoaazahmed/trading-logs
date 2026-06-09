"use client"

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { EnrichedTrade } from '@/lib/trades/types'

type Props = {
  trade: EnrichedTrade | null
  onClose: () => void
  onConfirm: (tradeId: string) => Promise<void>
}

export function DeleteTradeDialog({ trade, onClose, onConfirm }: Props) {
  const { t } = useTranslation()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleConfirm() {
    if (!trade) return
    setIsDeleting(true)
    await onConfirm(trade.id)
    setIsDeleting(false)
  }

  return (
    <AlertDialog open={!!trade} onOpenChange={(o) => { if (!o) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('trades.deleteConfirmTitle', { number: trade?.trade_number ?? '' })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('trades.deleteConfirmDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose} disabled={isDeleting}>
            {t('trades.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            variant="destructive"
          >
            {t('trades.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
