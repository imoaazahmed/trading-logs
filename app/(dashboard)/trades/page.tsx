"use client"

import { useTranslation } from "react-i18next"

export default function TradesPage() {
  const { t } = useTranslation()
  return <div className="p-6"><p className="text-muted-foreground text-sm">{t("sidebar.trades")}</p></div>
}
