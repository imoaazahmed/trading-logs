import * as yup from "yup"

export const loginSchema = yup.object({
  email: yup
    .string()
    .email("validation.email.invalid")
    .required("validation.email.required"),
  password: yup
    .string()
    .min(6, "validation.password.minLength")
    .required("validation.password.required"),
})

export const signupSchema = yup.object({
  email: yup
    .string()
    .email("validation.email.invalid")
    .required("validation.email.required"),
  password: yup
    .string()
    .min(6, "validation.password.minLength")
    .required("validation.password.required"),
})

export const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .email("validation.email.invalid")
    .required("validation.email.required"),
})

export const resetPasswordSchema = yup.object({
  password: yup
    .string()
    .min(6, "validation.password.minLength")
    .required("validation.password.required"),
  confirm: yup
    .string()
    .oneOf([yup.ref("password")], "validation.confirmPassword.mismatch")
    .required("validation.confirmPassword.required"),
})

export type LoginFormValues = yup.InferType<typeof loginSchema>
export type SignupFormValues = yup.InferType<typeof signupSchema>
export type ForgotPasswordFormValues = yup.InferType<typeof forgotPasswordSchema>
export type ResetPasswordFormValues = yup.InferType<typeof resetPasswordSchema>
