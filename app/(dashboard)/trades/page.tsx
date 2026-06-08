"use client"

import { useTranslation } from "react-i18next"

export default function TradesPage() {
  const { t } = useTranslation()
  return <p className="text-muted-foreground text-sm">{t("sidebar.trades")}</p>
}
