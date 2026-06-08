import Link from "next/link"
import type { User } from "@supabase/supabase-js"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { LocaleSwitcher } from "@/components/locale-switcher"

export function Navbar({ user }: { user: User }) {
  return (
    <header className="flex h-14 shrink-0 items-center border-b px-4 gap-2">
      <Link
        href="/overview"
        className="me-auto font-heading text-sm font-semibold tracking-tight"
      >
        Trading Logs
      </Link>
      <LocaleSwitcher />
      <ThemeToggle />
      <UserMenu user={user} />
    </header>
  )
}
