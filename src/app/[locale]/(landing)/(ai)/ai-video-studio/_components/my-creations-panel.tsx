'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

import { toStudioErrorMessage } from '../_lib/error-messages';
import { VIDEO_STUDIO_REFRESH_EVENT, dispatchVideoStudioRefresh } from '../_lib/events';
import { StudioCopy, StudioErrorCopy } from '../_lib/types';
import {
  listVideoTasks,
  mapTaskToDraft,
  refreshPendingTasks,
} from '../_lib/video-task-client';
import { VideoCard } from './video-card';

type MyCreationsPanelProps = {
  copy: StudioCopy['myCreations'];
  statusLabels: StudioCopy['create']['status'];
  errors: StudioErrorCopy;
};

const PAGE_SIZE = 6;

function buildVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const normalized = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const visible: Array<number | 'ellipsis'> = [];
  for (let index = 0; index < normalized.length; index += 1) {
    const page = normalized[index];
    const previous = normalized[index - 1];
    if (typeof previous === 'number' && page - previous > 1) {
      visible.push('ellipsis');
    }
    visible.push(page);
  }

  return visible;
}

export function MyCreationsPanel({
  copy,
  statusLabels,
  errors,
}: MyCreationsPanelProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReturnType<typeof mapTaskToDraft>[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const inFlightRef = useRef(false);
  const pendingRequestRef = useRef<{ page: number; refreshing: boolean } | null>(null);

  const loadCreations = useCallback(async (page: number, refreshing = false) => {
    if (inFlightRef.current) {
      pendingRequestRef.current = { page, refreshing: true };
      return;
    }

    inFlightRef.current = true;
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      let response = await listVideoTasks({ page, limit: PAGE_SIZE });
      const hasActive = await refreshPendingTasks(response.items, PAGE_SIZE);
      if (hasActive) {
        response = await listVideoTasks({ page, limit: PAGE_SIZE });
      }

      const responsePage = response.pagination.page;
      if (responsePage !== page) {
        setCurrentPage(responsePage);
      }

      setItems(response.items.map((item, index) => mapTaskToDraft(item, index)));
      setTotalItems(response.pagination.total);
      setTotalPages(response.pagination.totalPages);
      setError(null);
    } catch (fetchError: any) {
      const message = toStudioErrorMessage(fetchError, errors, 'listFailed');
      setError(message === errors.listFailed ? copy.errorFallback : message);
      setItems([]);
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
      setIsRefreshing(false);

      if (pendingRequestRef.current) {
        const pendingRequest = pendingRequestRef.current;
        pendingRequestRef.current = null;
        void loadCreations(pendingRequest.page, pendingRequest.refreshing);
      }
    }
  }, [copy.errorFallback, errors]);

  const visiblePages = useMemo(
    () => buildVisiblePages(currentPage, totalPages),
    [currentPage, totalPages]
  );

  useEffect(() => {
    void loadCreations(currentPage);
  }, [currentPage, loadCreations]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ reason?: string }>).detail;
      const shouldJumpFirstPage = detail?.reason === 'submit' || detail?.reason === 'status';
      if (shouldJumpFirstPage && currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
      const targetPage = shouldJumpFirstPage ? 1 : currentPage;
      void loadCreations(targetPage, true);
    };

    window.addEventListener(VIDEO_STUDIO_REFRESH_EVENT, handler as EventListener);
    return () =>
      window.removeEventListener(VIDEO_STUDIO_REFRESH_EVENT, handler as EventListener);
  }, [currentPage, loadCreations]);

  const handleRefresh = () => {
    dispatchVideoStudioRefresh('creations-refresh');
  };

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white/95 p-5 shadow-[0_18px_35px_-30px_rgba(15,23,42,0.9)] dark:border-zinc-700/70 dark:bg-zinc-900/70">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-zinc-200 pb-4 dark:border-zinc-700/60">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {copy.panelTitle}
          </h3>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-full border-zinc-300 px-3 text-xs dark:border-zinc-600"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={isRefreshing ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          {isRefreshing ? copy.refreshingButton : copy.refreshButton}
        </Button>
      </header>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <p className="col-span-full text-xs text-zinc-500 dark:text-zinc-400">
            {copy.loading}
          </p>
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`creation-skeleton-${index}`}
              className="animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100/60 p-3 dark:border-zinc-700 dark:bg-zinc-800/50"
            >
              <div className="h-28 rounded-xl bg-zinc-200/90 dark:bg-zinc-700/80" />
              <div className="mt-3 h-4 w-3/4 rounded bg-zinc-200/90 dark:bg-zinc-700/80" />
              <div className="mt-2 h-3 w-full rounded bg-zinc-200/80 dark:bg-zinc-700/60" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 px-5 py-12 text-center dark:border-zinc-700 dark:bg-zinc-950/50">
          <h4 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            {copy.emptyTitle}
          </h4>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 px-5 py-12 text-center dark:border-zinc-700 dark:bg-zinc-950/50">
          <h4 className="text-base font-semibold text-zinc-800 dark:text-zinc-200">
            {copy.emptyTitle}
          </h4>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{copy.emptyDescription}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className={cn('grid gap-3 md:grid-cols-2 xl:grid-cols-3')}>
            {items.map((item) => (
              <VideoCard
                key={item.id}
                item={item}
                statusLabels={statusLabels}
                actionsCopy={copy.actions}
              />
            ))}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-700/70">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {copy.totalLabel}: {totalItems}
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage <= 1}
                className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
              >
                {copy.previousLabel}
              </button>

              {visiblePages.map((page, index) =>
                page === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${index}`}
                    className="px-1 text-xs text-zinc-500 dark:text-zinc-400"
                  >
                    ...
                  </span>
                ) : (
                  <button
                    key={`page-${page}`}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      'rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition',
                      currentPage === page
                        ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900'
                        : 'border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500'
                    )}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
                disabled={currentPage >= totalPages}
                className="rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:border-zinc-500 disabled:cursor-not-allowed disabled:opacity-45 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
              >
                {copy.nextLabel}
              </button>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {copy.pageLabel}: {currentPage}/{totalPages}
            </p>
          </footer>
        </div>
      )}
    </section>
  );
}
