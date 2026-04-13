'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

import { toStudioErrorMessage } from '../_lib/error-messages';
import { VIDEO_STUDIO_REFRESH_EVENT, dispatchVideoStudioRefresh } from '../_lib/events';
import { StudioCopy, StudioErrorCopy, VideoDraft } from '../_lib/types';
import {
  listVideoTasks,
  mapTaskToDraft,
  refreshPendingTasks,
} from '../_lib/video-task-client';
import { VideoCard } from './video-card';

type HistoryPanelProps = {
  copy: StudioCopy['create']['history'];
  statusLabels: StudioCopy['create']['status'];
  errors: StudioErrorCopy;
};

const HISTORY_LIMIT = 4;

export function HistoryPanel({ copy, statusLabels, errors }: HistoryPanelProps) {
  const [items, setItems] = useState<VideoDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const pendingRefreshRef = useRef(false);

  const loadHistory = useCallback(
    async (options?: { refreshing?: boolean }) => {
      const refreshing = options?.refreshing ?? false;
      if (inFlightRef.current) {
        pendingRefreshRef.current = true;
        return;
      }

      inFlightRef.current = true;
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        let response = await listVideoTasks({ page: 1, limit: HISTORY_LIMIT });
        const hasActive = await refreshPendingTasks(response.items, HISTORY_LIMIT);
        if (hasActive) {
          response = await listVideoTasks({ page: 1, limit: HISTORY_LIMIT });
        }

        setItems(response.items.map((item, index) => mapTaskToDraft(item, index)));
        setError(null);
      } catch (fetchError: any) {
        const message = toStudioErrorMessage(fetchError, errors, 'listFailed');
        setError(message === errors.listFailed ? copy.errorFallback : message);
      } finally {
        inFlightRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);

        if (pendingRefreshRef.current) {
          pendingRefreshRef.current = false;
          void loadHistory({ refreshing: true });
        }
      }
    },
    [copy.errorFallback, errors]
  );

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const handler = () => {
      void loadHistory({ refreshing: true });
    };
    window.addEventListener(VIDEO_STUDIO_REFRESH_EVENT, handler as EventListener);
    return () =>
      window.removeEventListener(VIDEO_STUDIO_REFRESH_EVENT, handler as EventListener);
  }, [loadHistory]);

  const hasActiveTasks = useMemo(
    () => items.some((item) => item.status === 'queued' || item.status === 'rendering'),
    [items]
  );

  useEffect(() => {
    if (!hasActiveTasks) return;
    const timer = window.setInterval(() => {
      void loadHistory({ refreshing: true });
    }, 12_000);

    return () => window.clearInterval(timer);
  }, [hasActiveTasks, loadHistory]);

  const handleRefresh = () => {
    dispatchVideoStudioRefresh('history-refresh');
  };

  return (
    <section className="flex min-h-[520px] flex-col rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-[0_18px_35px_-30px_rgba(15,23,42,0.9)] dark:border-zinc-700/70 dark:bg-zinc-900/70">
      <header className="mb-4 flex items-start justify-between gap-2 border-b border-dashed border-zinc-200 pb-3 dark:border-zinc-700/60">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-200">
            {copy.panelTitle}
          </h3>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{copy.panelHint}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 rounded-full border-zinc-300 px-3 text-xs dark:border-zinc-600"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={isRefreshing ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          {isRefreshing ? copy.refreshingButton : copy.refreshButton}
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{copy.loading}</p>
          {Array.from({ length: HISTORY_LIMIT }).map((_, index) => (
            <div
              key={`history-skeleton-${index}`}
              className="h-28 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100/60 dark:border-zinc-700 dark:bg-zinc-800/50"
            />
          ))}
        </div>
      ) : error ? (
        <div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-300">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 p-6 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-950/50 dark:text-zinc-300">
          {copy.empty}
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin]">
          {items.map((item) => (
            <VideoCard
              key={item.id}
              item={item}
              mode="compact"
              statusLabels={statusLabels}
              generatingLabel={copy.generatingLabel}
              actionsCopy={{
                view: '',
                previewButton: copy.previewButton,
                previewTitle: copy.previewTitle,
                previewHint: copy.previewHint,
                download: copy.downloadButton,
                delete: '',
                deleting: '',
                unavailable: '',
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
