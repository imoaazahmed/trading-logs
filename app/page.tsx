import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect("/overview")

  // Landing page goes here — placeholder for now
  return (
    <div className="flex min-h-svh items-center justify-center">
      <p className="text-muted-foreground text-sm">Landing page</p>
    </div>
  )
}
