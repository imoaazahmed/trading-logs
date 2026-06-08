import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { LandingNavbar } from "@/components/layout/landing-navbar"
import { LandingHero } from "@/components/landing/hero"

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) redirect("/overview")

  return (
    <div className="flex min-h-svh flex-col">
      <LandingNavbar />
      <LandingHero />
    </div>
  )
}
