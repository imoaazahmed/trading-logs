// lib/trades/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { Patch, RawTrade, TradeFormData } from './types'

export async function createPatch(): Promise<{ data: Patch | null; error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: 'errors.unauthorized' }

  const { data: existing } = await supabase
    .from('patches')
    .select('patch_number')
    .eq('user_id', user.id)
    .order('patch_number', { ascending: false })
    .limit(1)

  const nextNumber = existing && existing.length > 0 ? existing[0].patch_number + 1 : 1

  const { data, error } = await supabase
    .from('patches')
    .insert({ user_id: user.id, patch_number: nextNumber })
    .select()
    .single()

  if (error) return { data: null, error: 'errors.generic' }
  revalidatePath('/trades')
  return { data: data as Patch, error: null }
}

export async function getPatchTrades(
  patchId: string
): Promise<{ data: RawTrade[]; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('patch_id', patchId)
    .order('trade_number', { ascending: true })

  if (error) return { data: [], error: 'errors.generic' }
  return { data: (data ?? []) as RawTrade[], error: null }
}

export async function addTrade(
  patchId: string,
  formData: TradeFormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'errors.unauthorized' }

  const { data: existing } = await supabase
    .from('trades')
    .select('trade_number')
    .eq('patch_id', patchId)
    .order('trade_number', { ascending: false })
    .limit(1)

  const nextNumber = existing && existing.length > 0 ? existing[0].trade_number + 1 : 1

  // Convert HH:MM to HH:MM:SS for DB time column
  const trade_time = formData.trade_time.length === 5
    ? formData.trade_time + ':00'
    : formData.trade_time

  const { error } = await supabase.from('trades').insert({
    user_id: user.id,
    patch_id: patchId,
    trade_number: nextNumber,
    ...formData,
    trade_time,
  })

  if (error) return { error: 'errors.generic' }
  revalidatePath('/trades')
  return { error: null }
}

export async function updateTrade(
  tradeId: string,
  formData: TradeFormData
): Promise<{ error: string | null }> {
  const supabase = await createClient()

  const trade_time = formData.trade_time.length === 5
    ? formData.trade_time + ':00'
    : formData.trade_time

  const { error } = await supabase
    .from('trades')
    .update({ ...formData, trade_time, updated_at: new Date().toISOString() })
    .eq('id', tradeId)

  if (error) return { error: 'errors.generic' }
  revalidatePath('/trades')
  return { error: null }
}

export async function deleteTrade(tradeId: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { error } = await supabase.from('trades').delete().eq('id', tradeId)
  if (error) return { error: 'errors.generic' }
  revalidatePath('/trades')
  return { error: null }
}
