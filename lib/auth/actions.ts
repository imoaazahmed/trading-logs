"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function login(_: unknown, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  })

  if (error) return { error: error.message }

  redirect("/overview")
}

export async function signup(_: unknown, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  })

  if (error) return { error: error.message }

  return { success: "Check your email to confirm your account." }
}

export async function forgotPassword(_: unknown, formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(
    formData.get("email") as string,
    { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/reset-password` }
  )

  if (error) return { error: error.message }

  return { success: "Check your email for a password reset link." }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}

export async function resetPassword(_: unknown, formData: FormData) {
  const password = formData.get("password") as string
  const confirm = formData.get("confirm") as string

  if (password !== confirm) return { error: "Passwords do not match." }

  const supabase = await createClient()

  const { error } = await supabase.auth.updateUser({ password })

  if (error) return { error: error.message }

  redirect("/overview")
}
