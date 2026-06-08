"use client"

import { useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useForm } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { forgotPassword } from "@/lib/auth/actions"
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "@/lib/schemas/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [successKey, setSuccessKey] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: yupResolver(forgotPasswordSchema) })

  async function onSubmit(data: ForgotPasswordFormValues) {
    const result = await forgotPassword(data)
    if (result?.error) {
      setError("root", { message: result.error })
    } else if (result?.success) {
      setSuccessKey(result.success)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("auth.forgotPassword.title")}</CardTitle>
        <CardDescription>{t("auth.forgotPassword.description")}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-4">
          {errors.root && (
            <p className="text-sm text-destructive">
              {t(errors.root.message!, { defaultValue: errors.root.message })}
            </p>
          )}
          {successKey && (
            <p className="text-sm text-green-600">{t(successKey)}</p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t("auth.emailPlaceholder")}
              autoComplete="email"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{t(errors.email.message!)}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 mt-(--card-spacing)">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("auth.forgotPassword.submitting") : t("auth.forgotPassword.submit")}
          </Button>
          <Link
            href="/login"
            className="text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {t("auth.forgotPassword.backToSignIn")}
          </Link>
        </CardFooter>
      </form>
    </Card>
  )
}
