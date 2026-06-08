'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { LocaleSwitcher } from '@/components/locale-switcher';

export default function Page() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">{t('home.title')}</h1>
          <p>{t('home.subtitle')}</p>
          <p>{t('home.buttonHint')}</p>
          <div className="mt-2 flex gap-2">
            <Button onClick={() => setOpen(true)}>{t('common.button')}</Button>
            <LocaleSwitcher />
          </div>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          ({t('home.darkModeHint', { key: 'd' })})
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen} direction="right">
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t('drawer.title')}</DrawerTitle>
            <DrawerDescription>{t('drawer.description')}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button variant="outline">{t('common.close')}</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
