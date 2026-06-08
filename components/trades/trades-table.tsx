"use client"

import { useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { EnrichedTrade } from '@/lib/trades/types'

type Props = {
  trades: EnrichedTrade[]
  onEdit: (trade: EnrichedTrade) => void
  onDelete: (trade: EnrichedTrade) => void
}

function fmtCurrency(value: number): string {
  return '$' + Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function fmtPercent(value: number): string {
  return value.toFixed(2) + '%'
}

function fmtDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const year = y.slice(2)
  return `${parseInt(d)} ${months[parseInt(m) - 1]} '${year}`
}

function fmtTime(timeStr: string): string {
  const [hStr, mStr] = timeStr.split(':')
  const h = parseInt(hStr)
  const ampm = h >= 12 ? 'P' : 'A'
  const h12 = h % 12 || 12
  return `${h12}:${mStr} ${ampm}`
}

export function TradesTable({ trades, onEdit, onDelete }: Props) {
  const { t } = useTranslation()

  const columns = useMemo<ColumnDef<EnrichedTrade>[]>(
    () => [
      {
        accessorKey: 'trade_number',
        header: t('trades.columns.number'),
        cell: ({ getValue }) => (
          <span className="font-medium tabular-nums">{getValue<number>()}</span>
        ),
      },
      {
        accessorKey: 'trade_date',
        header: t('trades.columns.date'),
        cell: ({ getValue }) => fmtDate(getValue<string>()),
      },
      {
        accessorKey: 'trade_time',
        header: t('trades.columns.time'),
        cell: ({ getValue }) => fmtTime(getValue<string>()),
      },
      {
        accessorKey: 'coin',
        header: t('trades.columns.coin'),
      },
      {
        accessorKey: 'direction',
        header: t('trades.columns.direction'),
        cell: ({ getValue }) => {
          const v = getValue<string>()
          return (
            <span className={v === 'long'
              ? 'text-green-600 dark:text-green-400 font-medium'
              : 'text-red-500 font-medium'
            }>
              {t(`trades.direction.${v}`)}
            </span>
          )
        },
      },
      {
        accessorKey: 'order_type',
        header: t('trades.columns.orderType'),
        cell: ({ getValue }) => t(`trades.orderType.${getValue<string>()}`),
      },
      {
        accessorKey: 'avg_entry',
        header: t('trades.columns.avgEntry'),
        cell: ({ getValue }) => (
          <span className="tabular-nums">{fmtCurrency(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'stop_loss',
        header: t('trades.columns.stopLoss'),
        cell: ({ getValue }) => (
          <span className="tabular-nums">{fmtCurrency(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'avg_exit',
        header: t('trades.columns.avgExit'),
        cell: ({ getValue }) => (
          <span className="tabular-nums">{fmtCurrency(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'risk',
        header: t('trades.columns.risk'),
        cell: ({ getValue }) => (
          <span className="tabular-nums">{fmtCurrency(getValue<number>())}</span>
        ),
      },
      {
        accessorKey: 'realised_loss',
        header: () => (
          <span className="text-muted-foreground">{t('trades.columns.realisedLoss')}</span>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number | null>()
          if (v === null) return null
          return <span className="tabular-nums text-red-500">{fmtCurrency(v)}</span>
        },
      },
      {
        accessorKey: 'realised_win',
        header: () => (
          <span className="text-muted-foreground">{t('trades.columns.realisedWin')}</span>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number | null>()
          if (v === null) return null
          return (
            <span className="tabular-nums text-green-600 dark:text-green-400">
              {fmtCurrency(v)}
            </span>
          )
        },
      },
      {
        accessorKey: 'deviation',
        header: () => (
          <span className="text-muted-foreground">{t('trades.columns.deviation')}</span>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number | null>()
          if (v === null) return null
          return <span className="tabular-nums">{fmtPercent(v)}</span>
        },
      },
      {
        accessorKey: 'r_multiple',
        header: () => (
          <span className="text-muted-foreground">{t('trades.columns.rMultiple')}</span>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number>()
          return (
            <span className={`tabular-nums font-medium ${
              v >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-500'
            }`}>
              {v.toFixed(2)}
            </span>
          )
        },
      },
      {
        accessorKey: 'risk_volatility',
        header: () => (
          <span className="text-muted-foreground">{t('trades.columns.riskVolatility')}</span>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number | null>()
          if (v === null) return null
          return <span className="tabular-nums">{fmtPercent(v)}</span>
        },
      },
      {
        accessorKey: 'cumulative_pnl',
        header: () => (
          <span className="text-muted-foreground">{t('trades.columns.cumulativePnl')}</span>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number>()
          return (
            <span className={`tabular-nums font-medium ${
              v >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-500'
            }`}>
              {(v >= 0 ? '+' : '') + fmtCurrency(Math.abs(v))}
            </span>
          )
        },
      },
      {
        accessorKey: 'cumulative_r',
        header: () => (
          <span className="text-muted-foreground">{t('trades.columns.cumulativeR')}</span>
        ),
        cell: ({ getValue }) => {
          const v = getValue<number>()
          return (
            <span className={`tabular-nums font-medium ${
              v >= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-500'
            }`}>
              {v.toFixed(2)}
            </span>
          )
        },
      },
      {
        accessorKey: 'rules_followed',
        header: t('trades.columns.rulesFollowed'),
        cell: ({ getValue }) => {
          const v = getValue<boolean>()
          return (
            <span className={v
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-500'
            }>
              {t(v ? 'trades.form.rulesYes' : 'trades.form.rulesNo')}
            </span>
          )
        },
      },
      {
        accessorKey: 'setup_type',
        header: t('trades.columns.setupType'),
      },
      {
        id: 'actions',
        header: t('trades.columns.actions'),
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onEdit(row.original)}
              aria-label={t('trades.editTrade')}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(row.original)}
              aria-label={t('trades.deleteTrade')}
            >
              <Trash2 className="size-3.5 text-red-500" />
            </Button>
          </div>
        ),
      },
    ],
    [t, onEdit, onDelete]
  )

  const table = useReactTable({
    data: trades,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="rounded-md border bg-background overflow-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id} className="whitespace-nowrap">
                  {flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-32 text-center text-muted-foreground"
              >
                {t('trades.emptyState')}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
