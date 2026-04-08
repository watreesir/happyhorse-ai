'use client';

import { useEffect, useState } from 'react';
import { ImagePlus, Layers3, LoaderCircle, Sparkles, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/lib/utils';

import { STUDIO_ASPECT_RATIOS } from '../_data/mock-data';
import { StudioCopy, StudioTaskLifecycle } from '../_lib/types';
import { dispatchVideoStudioRefresh } from '../_lib/events';
import {
  POLL_INTERVAL_MS,
  generateVideoTask,
  queryVideoTask,
  toLifecycle,
} from '../_lib/video-task-client';

type WorkspacePanelProps = {
  copy: StudioCopy['create']['workspace'];
};

export function WorkspacePanel({ copy }: WorkspacePanelProps) {
  const [prompt, setPrompt] = useState('');
  const [activeRatio, setActiveRatio] = useState<string>(
    STUDIO_ASPECT_RATIOS[0]?.value ?? '16:9'
  );
  const [taskLifecycle, setTaskLifecycle] = useState<StudioTaskLifecycle>('idle');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeTaskId) {
      return;
    }

    let canceled = false;
    const poll = async () => {
      try {
        const task = await queryVideoTask(activeTaskId);
        if (canceled) return;
        const nextLifecycle = toLifecycle(task.status);
        setTaskLifecycle(nextLifecycle);
        if (nextLifecycle === 'failed') {
          setSubmitError(task.errorMessage || null);
        } else {
          setSubmitError(null);
        }
        dispatchVideoStudioRefresh('status');

        if (nextLifecycle === 'completed' || nextLifecycle === 'failed') {
          setActiveTaskId(null);
        }
      } catch (error: any) {
        if (canceled) return;
        setTaskLifecycle('failed');
        setSubmitError(error?.message || 'query failed');
        setActiveTaskId(null);
        dispatchVideoStudioRefresh('status');
      }
    };

    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      canceled = true;
      window.clearInterval(timer);
    };
  }, [activeTaskId]);

  const handleSubmit = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setSubmitError(copy.promptRequired);
      return;
    }

    setSubmitError(null);
    setTaskLifecycle('submitting');

    try {
      const task = await generateVideoTask({
        prompt: trimmedPrompt,
        aspectRatio: activeRatio,
      });

      const lifecycle = toLifecycle(task.status);
      setTaskLifecycle(lifecycle);
      dispatchVideoStudioRefresh('submit');

      if (lifecycle === 'completed') {
        toast.success('Draft task completed.');
      } else if (lifecycle === 'failed') {
        setSubmitError(task.errorMessage || null);
        toast.error(task.errorMessage || 'Task failed.');
      } else {
        setActiveTaskId(task.id);
        toast.success('Draft task submitted.');
      }
    } catch (error: any) {
      const message = error?.message || 'Unable to submit task';
      setTaskLifecycle('failed');
      setSubmitError(message);
      toast.error(message);
    }
  };

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-[0_18px_35px_-30px_rgba(15,23,42,0.9)] dark:border-zinc-700/70 dark:bg-zinc-900/70">
      <header className="mb-4 border-b border-dashed border-zinc-200 pb-3 dark:border-zinc-700/60">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-200">
          {copy.panelTitle}
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{copy.panelHint}</p>
      </header>

      <div className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {copy.promptLabel}
          </label>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={copy.promptPlaceholder}
            className="min-h-[132px] resize-none border-zinc-300/80 bg-zinc-50 text-sm dark:border-zinc-700/70 dark:bg-zinc-950/80"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              {copy.uploadLabel}
            </label>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {copy.uploadHint}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="flex min-h-24 items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300/80 bg-zinc-50/80 px-3 py-4 text-sm text-zinc-600 transition hover:border-sky-300 hover:bg-sky-50 dark:border-zinc-700/80 dark:bg-zinc-950/60 dark:text-zinc-300 dark:hover:border-sky-500/50 dark:hover:bg-sky-500/10"
            >
              <UploadCloud className="h-4 w-4" />
              {copy.uploadSlots.primary}
            </button>
            <button
              type="button"
              className="flex min-h-24 items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300/80 bg-zinc-50/80 px-3 py-4 text-sm text-zinc-600 transition hover:border-amber-300 hover:bg-amber-50 dark:border-zinc-700/80 dark:bg-zinc-950/60 dark:text-zinc-300 dark:hover:border-amber-500/50 dark:hover:bg-amber-500/10"
            >
              <ImagePlus className="h-4 w-4" />
              {copy.uploadSlots.optional}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {copy.ratioLabel}
          </label>
          <div className="grid grid-cols-4 gap-2">
            {STUDIO_ASPECT_RATIOS.map((ratio) => (
              <button
                key={ratio.value}
                type="button"
                onClick={() => setActiveRatio(ratio.value)}
                className={cn(
                  'rounded-lg border px-2 py-2 text-xs font-semibold transition',
                  activeRatio === ratio.value
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900'
                    : 'border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500'
                )}
              >
                {ratio.label}
              </button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={taskLifecycle === 'submitting'}
          className="h-10 w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {taskLifecycle === 'submitting' ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {taskLifecycle === 'submitting' ? copy.statuses.submitting : copy.runButton}
        </Button>

        <div className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3 py-2 dark:border-zinc-700/70 dark:bg-zinc-950/50">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {copy.statusLabel}
          </p>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            {copy.statuses[taskLifecycle]}
          </p>
          {submitError ? (
            <p className="text-xs text-rose-600 dark:text-rose-300">
              {copy.submitErrorPrefix}: {submitError}
            </p>
          ) : null}
        </div>

        <p className="flex items-start gap-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          <Layers3 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {copy.helper}
        </p>
      </div>
    </section>
  );
}
