'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { cn } from '@/shared/lib/utils';

import { StudioCopy, StudioTab } from '../_lib/types';

type StudioTabsProps = {
  copy: StudioCopy['tabs'];
  createPanel: ReactNode;
  myCreationsPanel: ReactNode;
};

function parseTab(value: string | null): StudioTab {
  return value === 'my-creations' ? 'my-creations' : 'create';
}

export function StudioTabs({ copy, createPanel, myCreationsPanel }: StudioTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialTab = useMemo(
    () => parseTab(searchParams?.get('studioTab') ?? null),
    [searchParams]
  );
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);

  useEffect(() => {
    setActiveTab(parseTab(searchParams?.get('studioTab') ?? null));
  }, [searchParams]);

  const changeTab = (nextTab: StudioTab) => {
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('studioTab', nextTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const tabs = [
    {
      key: 'create' as const,
      label: copy.create.label,
      hint: copy.create.hint,
    },
    {
      key: 'my-creations' as const,
      label: copy.myCreations.label,
      hint: copy.myCreations.hint,
    },
  ];

  return (
    <section className="space-y-5">
      <div className="grid gap-2 rounded-2xl border border-zinc-200/80 bg-zinc-50/80 p-2 dark:border-zinc-700/70 dark:bg-zinc-900/60 md:grid-cols-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => changeTab(tab.key)}
            className={cn(
              'rounded-xl border px-4 py-4 text-left transition-all',
              activeTab === tab.key
                ? 'border-zinc-900 bg-zinc-900 text-white shadow-[0_16px_24px_-18px_rgba(15,23,42,1)] dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900'
                : 'border-transparent bg-white/70 text-zinc-700 hover:border-zinc-300 dark:bg-zinc-800/70 dark:text-zinc-200 dark:hover:border-zinc-600'
            )}
          >
            <p className="text-base font-semibold">{tab.label}</p>
            <p
              className={cn(
                'mt-1 text-sm',
                activeTab === tab.key
                  ? 'text-zinc-200 dark:text-zinc-700'
                  : 'text-zinc-500 dark:text-zinc-400'
              )}
            >
              {tab.hint}
            </p>
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        className={cn(activeTab === 'create' ? 'block' : 'hidden')}
        aria-hidden={activeTab !== 'create'}
      >
        {createPanel}
      </div>
      <div
        role="tabpanel"
        className={cn(activeTab === 'my-creations' ? 'block' : 'hidden')}
        aria-hidden={activeTab !== 'my-creations'}
      >
        {myCreationsPanel}
      </div>
    </section>
  );
}
