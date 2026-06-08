"use client"

import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { Search } from "lucide-react"
import Link from "next/link"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { Card, CardContent } from "@/components/ui/card"

export default function NotFound() {
  const { t } = useTranslation()
  const router = useRouter()

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const q = (e.currentTarget.elements.namedItem("q") as HTMLInputElement).value.trim()
    if (q) router.push(q.startsWith("/") ? q : `/${q}`)
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted px-4">
      <Card className="w-full max-w-4xl">
        <CardContent className="flex flex-col items-center gap-6 py-16 text-center">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-2xl font-bold">{t("notFound.title")}</h1>
            <p className="text-muted-foreground">{t("notFound.description")}</p>
            <p className="text-muted-foreground">{t("notFound.suggestion")}</p>
          </div>

          <form onSubmit={handleSearch} className="w-full max-w-sm">
            <InputGroup>
              <InputGroupAddon align="inline-start">
                <InputGroupText><Search /></InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                name="q"
                autoComplete="off"
                placeholder={t("notFound.searchPlaceholder")}
              />
              <InputGroupAddon align="inline-end">
                <Kbd>/</Kbd>
              </InputGroupAddon>
            </InputGroup>
          </form>

          <Link href="/" className="text-sm font-semibold hover:underline">
            {t("notFound.goHome")}
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
