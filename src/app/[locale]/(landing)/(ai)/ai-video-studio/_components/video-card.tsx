'use client';

import { useState } from 'react';
import {
  AlertCircle,
  Clock3,
  Download,
  Expand,
  LoaderCircle,
  PlayCircle,
  Trash2,
} from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { cn } from '@/shared/lib/utils';

import { VideoDraft, VideoPalette, VideoStatus } from '../_lib/types';

type VideoCardMode = 'default' | 'compact' | 'inspiration';

type VideoCardActionsCopy = {
  view: string;
  previewButton: string;
  previewTitle: string;
  previewHint: string;
  download: string;
  delete?: string;
  deleting?: string;
  deleteConfirm?: string;
  deleteSuccess?: string;
  unavailable: string;
};

type VideoCardProps = {
  item: VideoDraft;
  mode?: VideoCardMode;
  actionLabel?: string;
  onAction?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  statusLabels: Record<VideoStatus, string>;
  generatingLabel?: string;
  actionsCopy?: VideoCardActionsCopy;
};

const PALETTE_CLASS: Record<VideoPalette, string> = {
  copper:
    'from-amber-900/70 via-orange-700/45 to-zinc-900/80 border-amber-200/30',
  teal: 'from-teal-900/70 via-cyan-700/45 to-slate-900/80 border-cyan-200/30',
  ink: 'from-slate-900/75 via-zinc-800/60 to-slate-950/85 border-slate-200/25',
  amber:
    'from-yellow-900/70 via-orange-700/45 to-stone-900/80 border-yellow-200/30',
  slate:
    'from-stone-900/70 via-slate-700/50 to-zinc-900/80 border-stone-200/25',
  crimson:
    'from-red-950/70 via-rose-800/50 to-zinc-900/80 border-rose-200/30',
};

function StatusIcon({ status }: { status: VideoStatus }) {
  if (status === 'ready') return <PlayCircle className="h-3.5 w-3.5" />;
  if (status === 'rendering') return <LoaderCircle className="h-3.5 w-3.5 animate-spin" />;
  if (status === 'queued') return <Clock3 className="h-3.5 w-3.5" />;
  return <AlertCircle className="h-3.5 w-3.5" />;
}

function statusClass(status: VideoStatus) {
  if (status === 'ready') {
    return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-500/15 dark:text-teal-200 dark:border-teal-400/30';
  }
  if (status === 'rendering') {
    return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-400/30';
  }
  if (status === 'queued') {
    return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/30';
  }
  return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-400/30';
}

export function VideoCard({
  item,
  mode = 'default',
  actionLabel,
  onAction,
  onDelete,
  isDeleting = false,
  statusLabels,
  generatingLabel = 'Generating',
  actionsCopy,
}: VideoCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const compact = mode === 'compact';
  const inspiration = mode === 'inspiration';
  const hasPreview = Boolean(item.previewUrl);
  const mediaActions = actionsCopy ?? null;
  const isGeneratingTask = item.status === 'queued' || item.status === 'rendering';
  const showMediaActions =
    !compact && !inspiration && item.status === 'ready' && Boolean(mediaActions);
  const showCompactDownload = compact && !inspiration && Boolean(mediaActions?.download);
  const showCompactPreview = compact && !inspiration && hasPreview && Boolean(mediaActions?.previewButton);
  const showDeleteAction = !compact && !inspiration && Boolean(onDelete && mediaActions?.delete);
  const compactDownloadDisabled = item.status !== 'ready' || !hasPreview || isDownloading;

  const openPreview = () => {
    if (!item.previewUrl) return;
    setIsPreviewOpen(true);
  };

  const downloadPreview = async () => {
    if (!item.previewUrl || isDownloading) return;

    try {
      setIsDownloading(true);
      const response = await fetch(
        `/api/proxy/file?url=${encodeURIComponent(item.previewUrl)}`
      );
      if (!response.ok) {
        throw new Error('download failed');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = `${item.id}.mp4`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 300);
    } catch (error) {
      console.error('video download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <article
        className={cn(
          'group overflow-hidden border bg-white/95 shadow-[0_8px_20px_-14px_rgba(17,24,39,0.7)] transition-colors dark:bg-zinc-900/70',
          compact ? 'rounded-xl p-3' : 'rounded-2xl p-4',
          inspiration
            ? 'border-zinc-200/80 dark:border-zinc-700/80'
            : 'border-zinc-200/70 dark:border-zinc-700/70'
        )}
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-xl border text-white',
            PALETTE_CLASS[item.palette]
          )}
          style={{ aspectRatio: item.aspectRatio }}
        >
          {hasPreview ? (
            <video
              className="absolute inset-0 h-full w-full object-cover"
              src={item.previewUrl ?? undefined}
              preload="metadata"
              muted
              playsInline
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.26),transparent_50%),radial-gradient(circle_at_85%_88%,rgba(255,255,255,0.12),transparent_40%)]" />
          {hasPreview ? <div className="absolute inset-0 bg-black/10" /> : null}
          {isGeneratingTask ? (
            <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-full border border-emerald-200/90 bg-emerald-50/95 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 shadow-sm dark:border-emerald-300/30 dark:bg-emerald-500/15 dark:text-emerald-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {generatingLabel}
            </div>
          ) : null}

          {showCompactPreview ? (
            <button
              type="button"
              onClick={openPreview}
              className="absolute top-2 right-2 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
              aria-label={mediaActions?.previewButton}
            >
              <Expand className="h-4 w-4" />
            </button>
          ) : null}

          <div className="absolute inset-0 grid place-items-center">
            <span className="rounded-full border border-white/30 bg-black/20 px-3 py-1 text-[11px] font-medium tracking-wide backdrop-blur">
              {item.lengthLabel} · {item.aspectRatio.replace(/\s+/g, '')}
            </span>
          </div>

          {inspiration && actionLabel ? (
            <div className="absolute inset-x-0 bottom-0 flex translate-y-2 justify-center px-3 pb-3 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
              <Button
                type="button"
                size="sm"
                className="h-8 rounded-full bg-white text-zinc-900 hover:bg-zinc-100"
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            </div>
          ) : null}
        </div>

        <div className={cn('space-y-2', compact ? 'mt-2.5' : 'mt-3')}>
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                'font-medium text-zinc-900 dark:text-zinc-100',
                compact ? 'line-clamp-1 text-sm' : 'line-clamp-2 text-[15px]'
              )}
            >
              {item.title}
            </h4>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                statusClass(item.status)
              )}
            >
              <StatusIcon status={item.status} />
              {statusLabels[item.status]}
            </span>
          </div>

          {!compact ? (
            <p className="line-clamp-2 text-[13px] text-zinc-600 dark:text-zinc-300">
              {item.prompt}
            </p>
          ) : null}

          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
            <span>{item.updatedLabel}</span>
            <span>{item.lengthLabel}</span>
          </div>

          {showMediaActions ? (
            hasPreview ? (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 rounded-full px-3 text-xs"
                  onClick={openPreview}
                >
                  {mediaActions?.view}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 rounded-full px-3 text-xs"
                  onClick={downloadPreview}
                  disabled={isDownloading}
                >
                  {mediaActions?.download}
                </Button>
                {showDeleteAction ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full px-3 text-xs"
                    onClick={onDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {isDeleting ? mediaActions?.deleting : mediaActions?.delete}
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2 pt-0.5">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {mediaActions?.unavailable}
                </p>
                {showDeleteAction ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-full px-3 text-xs"
                    onClick={onDelete}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    {isDeleting ? mediaActions?.deleting : mediaActions?.delete}
                  </Button>
                ) : null}
              </div>
            )
          ) : null}

          {showCompactDownload ? (
            <div className="pt-0.5">
              <Button
                type="button"
                size="sm"
                className="h-7 rounded-full px-3 text-xs"
                onClick={downloadPreview}
                disabled={compactDownloadDisabled}
              >
                {isDownloading ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                {mediaActions?.download}
              </Button>
            </div>
          ) : null}
        </div>
      </article>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent
          className="max-h-[92vh] max-w-[min(96vw,1200px)] gap-0 overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-100"
          showCloseButton
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {mediaActions?.previewTitle || mediaActions?.view || item.title}
            </DialogTitle>
            <DialogDescription>
              {mediaActions?.previewHint || mediaActions?.unavailable || item.prompt}
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-[60vh] items-center justify-center bg-black p-3 sm:p-5">
            {hasPreview ? (
              <video
                className="max-h-[78vh] w-full rounded-xl bg-black object-contain"
                src={item.previewUrl ?? undefined}
                controls
                playsInline
                preload="metadata"
                autoPlay
              />
            ) : null}
          </div>

          <div className="border-t border-white/10 px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-semibold text-zinc-100">{item.title}</p>
                <p className="text-xs text-zinc-400">
                  {item.lengthLabel} · {item.aspectRatio.replace(/\s+/g, '')}
                </p>
              </div>
              {mediaActions?.previewHint ? (
                <p className="max-w-xl text-xs text-zinc-400">{mediaActions.previewHint}</p>
              ) : null}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
