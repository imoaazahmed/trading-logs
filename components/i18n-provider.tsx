'use client';

import i18next from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { useRef } from 'react';
import type { Locale } from '@/lib/i18n';

function createInstance(locale: Locale, messages: Record<string, unknown>) {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    lng: locale,
    resources: { [locale]: { translation: messages } },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
  return instance;
}

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const instanceRef = useRef(createInstance(locale, messages));
  return (
    <I18nextProvider i18n={instanceRef.current}>{children}</I18nextProvider>
  );
}
