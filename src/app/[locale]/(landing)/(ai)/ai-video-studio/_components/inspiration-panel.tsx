'use client';

import { useMemo } from 'react';

import { MOCK_INSPIRATIONS } from '../_data/mock-data';
import { StudioCopy } from '../_lib/types';
import { VideoCard } from './video-card';

type InspirationPanelProps = {
  copy: StudioCopy['create']['inspiration'];
  statusLabels: StudioCopy['create']['status'];
};

export function InspirationPanel({ copy, statusLabels }: InspirationPanelProps) {
  const items = useMemo(() => MOCK_INSPIRATIONS, []);

  return (
    <section className="flex min-h-[520px] flex-col rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-[0_18px_35px_-30px_rgba(15,23,42,0.9)] dark:border-zinc-700/70 dark:bg-zinc-900/70">
      <header className="mb-4 border-b border-dashed border-zinc-200 pb-3 dark:border-zinc-700/60">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-200">
          {copy.panelTitle}
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{copy.panelHint}</p>
      </header>

      {items.length === 0 ? (
        <div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-300">
          {copy.empty}
        </div>
      ) : (
        <div className="max-h-[700px] overflow-y-auto pr-1 [scrollbar-width:thin]">
          <div className="columns-1 gap-3 md:columns-2">
            {items.map((item) => (
              <div key={item.id} className="mb-3 break-inside-avoid">
                <VideoCard
                  item={item}
                  mode="inspiration"
                  actionLabel={copy.applyButton}
                  onAction={() => undefined}
                  statusLabels={statusLabels}
                />
                <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {copy.recipePrefix}: {item.recipeLabel}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
