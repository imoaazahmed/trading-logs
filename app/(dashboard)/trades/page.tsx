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

  const patches: Patch[] = (rows ?? []) as Patch[]

  return <TradesClient patches={patches} />
}
