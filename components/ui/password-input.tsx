"use client"

import { forwardRef, useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { useTranslation } from "react-i18next"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<React.ComponentProps<"input">, "type">
>(({ className, placeholder = "●●●●●●●●", ...props }, ref) => {
  const [visible, setVisible] = useState(false)
  const { t } = useTranslation()

  return (
    <InputGroup className={className}>
      <InputGroupInput
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        placeholder={placeholder}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-sm"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
        >
          {visible ? <EyeOff /> : <Eye />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
})

PasswordInput.displayName = "PasswordInput"

export { PasswordInput }
