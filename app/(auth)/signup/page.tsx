"use client"

import { useState } from "react"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useForm, useWatch } from "react-hook-form"
import { yupResolver } from "@hookform/resolvers/yup"
import { signup } from "@/lib/auth/actions"
import { signupSchema, type SignupFormValues } from "@/lib/schemas/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { PasswordStrength } from "@/components/ui/password-strength"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function SignupPage() {
  const { t } = useTranslation()
  const [successKey, setSuccessKey] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({ resolver: yupResolver(signupSchema) })

  const password = useWatch({ control, name: "password" }) ?? ""

  async function onSubmit(data: SignupFormValues) {
    clearErrors("root")
    setSuccessKey(null)
    const result = await signup({ email: data.email, password: data.password })
    if (result?.error) {
      setError("root", { message: result.error })
    } else if (result?.success) {
      setSuccessKey(result.success)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t("auth.signup.title")}</CardTitle>
        <CardDescription>{t("auth.signup.description")}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">{t(errors.password.message!)}</p>
            ) : (
              <PasswordStrength password={password} />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">{t("auth.confirmPassword")}</Label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              {...register("confirm")}
            />
            {errors.confirm && (
              <p className="text-xs text-destructive">{t(errors.confirm.message!)}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 mt-(--card-spacing)">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t("auth.signup.submitting") : t("auth.signup.submit")}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {t("auth.signup.hasAccount")}{" "}
            <Link href="/login" className="text-foreground hover:underline">
              {t("auth.signup.signinLink")}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
