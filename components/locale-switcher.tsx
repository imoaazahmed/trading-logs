'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { setLocale } from '@/app/actions';
import type { Locale } from '@/lib/i18n';

export function LocaleSwitcher() {
  const { i18n } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const locale = i18n.language as Locale;
  const next: Locale = locale === 'en' ? 'ar' : 'en';
  const label = locale === 'en' ? 'العربية' : 'English';

  function handleSwitch() {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <Button variant="outline" onClick={handleSwitch} disabled={isPending}>
      {label}
    </Button>
  );
}
