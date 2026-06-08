"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { LayoutDashboard, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

export function Sidebar() {
  const pathname = usePathname()
  const { t } = useTranslation()

  const links = [
    { href: "/overview", label: t("sidebar.overview"), icon: LayoutDashboard },
    { href: "/trades", label: t("sidebar.trades"), icon: TrendingUp },
  ]

  return (
    <aside className="flex w-56 shrink-0 flex-col border-e">
      <nav className="flex flex-col gap-1 p-2">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              pathname === href
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
