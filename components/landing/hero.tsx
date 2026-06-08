"use client"

import Link from "next/link"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

export function LandingHero() {
  const { t } = useTranslation()

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl">
          {t("landing.headline1")}
          <br />
          {t("landing.headline2")}
        </h1>
        <p className="max-w-md text-base text-muted-foreground">
          {t("landing.subtext")}
        </p>
      </div>
      <div className="flex gap-3">
        <Button size="lg" asChild>
          <Link href="/signup">{t("landing.cta")}</Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/login">{t("landing.ctaSecondary")}</Link>
        </Button>
      </div>
    </main>
  )
}
