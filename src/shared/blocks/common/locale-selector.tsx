'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Globe, Languages } from 'lucide-react';
import { useLocale } from 'next-intl';

import { usePathname, useRouter } from '@/core/i18n/navigation';
import { localeNames } from '@/config/locale';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { cacheSet } from '@/shared/lib/cache';
import { cn } from '@/shared/lib/utils';

export function LocaleSelector({
  type = 'icon',
  className,
}: {
  type?: 'icon' | 'button';
  className?: string;
}) {
  const currentLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSwitchLanguage = (value: string) => {
    if (value !== currentLocale) {
      // Update localStorage to sync with locale detector
      cacheSet('locale', value);
      const query = searchParams?.toString?.() ?? '';
      const href = query ? `${pathname}?${query}` : pathname;
      router.push(href, {
        locale: value,
      });
    }
  };

  // Return a placeholder during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button
        variant={type === 'icon' ? 'ghost' : 'outline'}
        size={type === 'icon' ? 'icon' : 'sm'}
        className={cn(
          type === 'icon' ? 'h-auto w-auto p-0' : 'hover:bg-primary/10',
          className
        )}
        disabled
      >
        {type === 'icon' ? (
          <Languages size={18} />
        ) : (
          <>
            <Globe size={16} />
            {localeNames[currentLocale]}
          </>
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {type === 'icon' ? (
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-auto w-auto p-0', className)}
          >
            <Languages size={18} />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className={cn('hover:bg-primary/10', className)}
          >
            <Globe size={16} />
            {localeNames[currentLocale]}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {Object.keys(localeNames).map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleSwitchLanguage(locale)}
          >
            <span>{localeNames[locale]}</span>
            {locale === currentLocale && (
              <Check size={16} className="text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
