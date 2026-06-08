import { createClient } from '@/lib/supabase/server'
import { TradesClient } from '@/components/trades/trades-client'
import type { Patch } from '@/lib/trades/types'

export default async function TradesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: rows } = await supabase
    .from('patches')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })

  let patches: Patch[] = (rows ?? []) as Patch[]

  if (patches.length === 0) {
    const { data: created } = await supabase
      .from('patches')
      .insert({ user_id: user.id, patch_number: 1, name: 'New Patch', patch_limit: 100, sort_order: 1 })
      .select()
      .single()
    if (created) patches = [created as Patch]
  }

  const initialPatchId = patches.at(-1)?.id ?? ''

  return <TradesClient patches={patches} initialPatchId={initialPatchId} />
}
