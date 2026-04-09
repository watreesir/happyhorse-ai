'use client';

import { useRef, useState } from 'react';

import { cn } from '@/shared/lib/utils';

import { INSPIRATION_ITEMS, InspirationItem } from '../_data/inspiration-items';
import { dispatchVideoStudioRecreate } from '../_lib/events';
import { StudioCopy } from '../_lib/types';

type InspirationPanelProps = {
  copy: StudioCopy['create']['inspiration'];
};

export function InspirationPanel({ copy }: InspirationPanelProps) {
  return (
    <section className="flex min-h-[520px] flex-col rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-[0_18px_35px_-30px_rgba(15,23,42,0.9)] dark:border-zinc-700/70 dark:bg-zinc-900/70">
      <header className="mb-4 border-b border-dashed border-zinc-200 pb-3 dark:border-zinc-700/60">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-200">
          {copy.panelTitle}
        </h3>
      </header>

      {INSPIRATION_ITEMS.length === 0 ? (
        <div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-300">
          {copy.empty}
        </div>
      ) : (
        <div className="max-h-[700px] overflow-y-auto pr-1 [scrollbar-width:thin]">
          <div className="grid grid-cols-2 gap-2">
            {INSPIRATION_ITEMS.map((item) => (
              <InspirationCard key={item.id} item={item} recreateLabel={copy.applyButton} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

type InspirationCardProps = {
  item: InspirationItem;
  recreateLabel: string;
};

function InspirationCard({ item, recreateLabel }: InspirationCardProps) {
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleRecreate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      dispatchVideoStudioRecreate({
        mode: item.mode,
        prompt: item.prompt,
        i2vMode: item.i2vMode ?? 'first-frame',
        imageUrl: item.imageUrl,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
      <div style={{ aspectRatio: item.aspectRatio }}>
        <video
          ref={videoRef}
          src={item.videoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
        />
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/35">
        <button
          type="button"
          onClick={() => void handleRecreate()}
          disabled={loading}
          className={cn(
            'scale-90 rounded-lg bg-white/95 px-4 py-2 text-xs font-semibold text-zinc-900 opacity-0 shadow-lg transition-all duration-200',
            'group-hover:scale-100 group-hover:opacity-100',
            'hover:bg-white active:scale-95',
            loading && 'cursor-not-allowed opacity-60'
          )}
        >
          {recreateLabel}
        </button>
      </div>
    </div>
  );
}
