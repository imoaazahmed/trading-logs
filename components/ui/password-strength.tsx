"use client"

import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

type Strength = 0 | 1 | 2

function getStrength(password: string): Strength {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return 0
  if (score <= 3) return 1
  return 2
}

const LEVELS = [
  { key: "passwordStrength.weak", bar: "bg-red-500", text: "text-red-500" },
  { key: "passwordStrength.fair", bar: "bg-yellow-500", text: "text-yellow-500" },
  { key: "passwordStrength.strong", bar: "bg-green-500", text: "text-green-500" },
] as const

export function PasswordStrength({ password }: { password: string }) {
  const { t } = useTranslation()
  const strength = useMemo(() => getStrength(password), [password])

  if (!password) return null

  const level = LEVELS[strength]

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1">
        {LEVELS.map((l, i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i <= strength ? level.bar : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className={cn("text-xs", level.text)}>{t(level.key)}</p>
    </div>
  )
}
