'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, isValidLocale, type Locale } from '@/lib/i18n';

export async function setLocale(locale: Locale): Promise<void> {
  if (!isValidLocale(locale)) return;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/',
  });
}
