"use client"

import { useTranslation } from "react-i18next"

export default function SettingsPage() {
  const { t } = useTranslation()
  return <p className="text-muted-foreground text-sm">{t("userMenu.settings")}</p>
}
