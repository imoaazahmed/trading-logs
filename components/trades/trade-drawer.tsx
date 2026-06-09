"use client"

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useTranslation } from 'react-i18next'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { tradeSchema, type TradeSchema } from '@/lib/schemas/trade'
import { calcPreview } from '@/lib/trades/calculations'
import type { EnrichedTrade } from '@/lib/trades/types'

type Props = {
  open: boolean
  initialData?: EnrichedTrade   // undefined = add mode, defined = edit mode
  onClose: () => void
  onSave: (data: TradeSchema) => Promise<string | null>
}

export function TradeDrawer({ open, initialData, onClose, onSave }: Props) {
  const { t, i18n } = useTranslation()
  const isEdit = !!initialData

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TradeSchema>({
    resolver: yupResolver(tradeSchema),
    defaultValues: { rules_followed: true },
  })

  // Reset form whenever drawer opens (new data or fresh add)
  useEffect(() => {
    if (!open) return
    if (initialData) {
      reset({
        trade_date: initialData.trade_date,
        trade_time: initialData.trade_time.slice(0, 5), // "HH:MM"
        coin: initialData.coin,
        direction: initialData.direction,
        order_type: initialData.order_type,
        avg_entry: initialData.avg_entry,
        stop_loss: initialData.stop_loss,
        avg_exit: initialData.avg_exit,
        risk: initialData.risk,
        rules_followed: initialData.rules_followed,
        setup_type: initialData.setup_type,
      })
    } else {
      reset({ rules_followed: true })
    }
  }, [open, initialData, reset])

  const [watchEntry, watchStop, watchExit, watchRisk, watchDir] = watch([
    'avg_entry', 'stop_loss', 'avg_exit', 'risk', 'direction',
  ])
  const preview = calcPreview(watchEntry, watchStop, watchExit, watchRisk, watchDir)

  async function onSubmit(data: TradeSchema) {
    const error = await onSave(data)
    if (error) setError('root', { message: error })
  }

  const side = i18n.dir() === 'rtl' ? 'left' : 'right'

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side={side} className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t(isEdit ? 'trades.editTrade' : 'trades.addTrade')}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4 pb-8">
          {errors.root && (
            <p className="text-sm text-destructive">
              {t(errors.root.message!, { defaultValue: errors.root.message })}
            </p>
          )}

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="trade_date">{t('trades.form.date')}</Label>
              <Input id="trade_date" type="date" {...register('trade_date')} />
              {errors.trade_date && (
                <p className="text-xs text-destructive">{t(errors.trade_date.message!)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trade_time">{t('trades.form.time')}</Label>
              <Input id="trade_time" type="time" {...register('trade_time')} />
              {errors.trade_time && (
                <p className="text-xs text-destructive">{t(errors.trade_time.message!)}</p>
              )}
            </div>
          </div>

          {/* Coin */}
          <div className="space-y-1.5">
            <Label htmlFor="coin">{t('trades.form.coin')}</Label>
            <Input
              id="coin"
              placeholder={t('trades.form.coinPlaceholder')}
              {...register('coin')}
            />
            {errors.coin && (
              <p className="text-xs text-destructive">{t(errors.coin.message!)}</p>
            )}
          </div>

          {/* Direction + Order Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('trades.form.direction')}</Label>
              <Select
                value={watch('direction') ?? ''}
                onValueChange={(v) =>
                  setValue('direction', v as 'long' | 'short', { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('trades.form.direction')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="long">{t('trades.form.directionLong')}</SelectItem>
                  <SelectItem value="short">{t('trades.form.directionShort')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.direction && (
                <p className="text-xs text-destructive">{t(errors.direction.message!)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{t('trades.form.orderType')}</Label>
              <Select
                value={watch('order_type') ?? ''}
                onValueChange={(v) =>
                  setValue('order_type', v as 'market' | 'limit', { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('trades.form.orderType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="market">{t('trades.form.orderTypeMarket')}</SelectItem>
                  <SelectItem value="limit">{t('trades.form.orderTypeLimit')}</SelectItem>
                </SelectContent>
              </Select>
              {errors.order_type && (
                <p className="text-xs text-destructive">{t(errors.order_type.message!)}</p>
              )}
            </div>
          </div>

          {/* Avg Entry + Stop Loss */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="avg_entry">{t('trades.form.avgEntry')}</Label>
              <Input
                id="avg_entry"
                type="number"
                step="any"
                placeholder="0.00"
                {...register('avg_entry', { valueAsNumber: true })}
              />
              {errors.avg_entry && (
                <p className="text-xs text-destructive">{t(errors.avg_entry.message!)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="stop_loss">{t('trades.form.stopLoss')}</Label>
              <Input
                id="stop_loss"
                type="number"
                step="any"
                placeholder="0.00"
                {...register('stop_loss', { valueAsNumber: true })}
              />
              {errors.stop_loss && (
                <p className="text-xs text-destructive">{t(errors.stop_loss.message!)}</p>
              )}
            </div>
          </div>

          {/* Avg Exit + Risk */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="avg_exit">{t('trades.form.avgExit')}</Label>
              <Input
                id="avg_exit"
                type="number"
                step="any"
                placeholder="0.00"
                {...register('avg_exit', { valueAsNumber: true })}
              />
              {errors.avg_exit && (
                <p className="text-xs text-destructive">{t(errors.avg_exit.message!)}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="risk">{t('trades.form.risk')}</Label>
              <Input
                id="risk"
                type="number"
                step="any"
                placeholder="0.00"
                {...register('risk', { valueAsNumber: true })}
              />
              {errors.risk && (
                <p className="text-xs text-destructive">{t(errors.risk.message!)}</p>
              )}
            </div>
          </div>

          {/* Rules + Setup Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('trades.form.rulesFollowed')}</Label>
              <Select
                value={watch('rules_followed') ? 'yes' : 'no'}
                onValueChange={(v) =>
                  setValue('rules_followed', v === 'yes', { shouldValidate: true })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t('trades.form.rulesYes')}</SelectItem>
                  <SelectItem value="no">{t('trades.form.rulesNo')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup_type">{t('trades.form.setupType')}</Label>
              <Input
                id="setup_type"
                placeholder={t('trades.form.setupTypePlaceholder')}
                {...register('setup_type')}
              />
              {errors.setup_type && (
                <p className="text-xs text-destructive">{t(errors.setup_type.message!)}</p>
              )}
            </div>
          </div>

          {/* Live preview */}
          {preview && (
            <div className="rounded-md border bg-muted/50 p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('trades.form.preview')}
              </p>
              <div className="flex flex-wrap gap-4 text-sm">
                <span>
                  {t('trades.columns.rMultiple')}:{' '}
                  <span className={`font-medium ${
                    preview.r_multiple >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-500'
                  }`}>
                    {preview.r_multiple.toFixed(2)}R
                  </span>
                </span>
                {preview.realised_win !== null && (
                  <span>
                    {t('trades.columns.realisedWin')}:{' '}
                    <span className="font-medium text-green-600 dark:text-green-400">
                      ${preview.realised_win.toFixed(2)}
                    </span>
                  </span>
                )}
                {preview.realised_loss !== null && (
                  <span>
                    {t('trades.columns.realisedLoss')}:{' '}
                    <span className="font-medium text-red-500">
                      ${preview.realised_loss.toFixed(2)}
                    </span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('trades.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t('trades.form.saving') : t('trades.form.save')}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
