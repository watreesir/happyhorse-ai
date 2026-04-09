'use client';

import { ChangeEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BellRing,
  Film,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Music2,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';
import { uploadStudioMediaFiles } from '@/shared/lib/media-upload';
import {
  VIDEO_STUDIO_DEFAULT_DRAFT,
  VIDEO_STUDIO_DRAFT_SESSION_KEY,
  VideoStudioDraft,
  VideoStudioDraftError,
  VideoStudioI2VMode,
  VideoStudioMode,
  VideoStudioUploadedAsset,
  buildVideoTaskPayloadFromDraft,
  mergeStudioDraft,
  parseStudioDraftPayload,
} from '@/shared/lib/video-studio-workflow';

import { STUDIO_ASPECT_RATIOS } from '../_data/mock-data';
import { toStudioErrorMessage } from '../_lib/error-messages';
import {
  VIDEO_STUDIO_RECREATE_EVENT,
  VideoStudioRecreateEventDetail,
  dispatchVideoStudioRefresh,
} from '../_lib/events';
import {
  StudioAudioSetting,
  StudioCopy,
  StudioErrorCopy,
  StudioResolution,
  StudioTaskLifecycle,
} from '../_lib/types';
import {
  POLL_INTERVAL_MS,
  generateVideoTask,
  queryVideoTask,
  toLifecycle,
} from '../_lib/video-task-client';

type WorkspacePanelProps = {
  copy: StudioCopy['create']['workspace'];
  errors: StudioErrorCopy;
};

type UploadMediaAccept = 'image' | 'video' | 'audio' | 'image-video';

type SingleUploadKey =
  | 'textAudio'
  | 'imageFirstFrame'
  | 'imageLastFrame'
  | 'imageFirstClip'
  | 'imageAudio'
  | 'referenceFirstFrame'
  | 'referenceVoice'
  | 'editVideo'
  | 'editReferenceImage';

const MAX_REFERENCE_MATERIALS = 5;
const MAX_POLL_FAILURES = 3;

function createDraftId() {
  return `studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function acceptByType(accept: UploadMediaAccept) {
  if (accept === 'image') return 'image/*';
  if (accept === 'video') return 'video/*';
  if (accept === 'audio') return 'audio/*';
  return 'image/*,video/*';
}

function mapDraftErrorToMessage(
  error: VideoStudioDraftError,
  copy: StudioCopy['create']['workspace']
) {
  if (error.code === 'PROMPT_REQUIRED') return copy.validationErrors.promptRequired;
  if (error.code === 'IMAGE_FIRST_FRAME_REQUIRED') {
    return copy.validationErrors.imageFirstFrameRequired;
  }
  if (error.code === 'IMAGE_FIRST_LAST_FRAME_REQUIRED') {
    return copy.validationErrors.imageFirstLastFrameRequired;
  }
  if (error.code === 'IMAGE_FIRST_CLIP_REQUIRED') {
    return copy.validationErrors.imageFirstClipRequired;
  }
  if (error.code === 'REFERENCE_MATERIAL_REQUIRED') {
    return copy.validationErrors.referenceMaterialRequired;
  }
  return copy.validationErrors.editVideoRequired;
}

function modeFromSearch(value: string | null): VideoStudioMode | null {
  if (
    value === 'text-to-video' ||
    value === 'image-to-video' ||
    value === 'reference-to-video' ||
    value === 'video-edit'
  ) {
    return value;
  }
  return null;
}

function i2vModeFromSearch(value: string | null): VideoStudioI2VMode | null {
  if (
    value === 'first-frame' ||
    value === 'first-last-frame' ||
    value === 'video-continuation'
  ) {
    return value;
  }
  return null;
}

function parseHandoffLifecycle(value: string | null): StudioTaskLifecycle | null {
  if (value === 'queued') return 'queued';
  if (value === 'processing') return 'processing';
  if (value === 'completed') return 'completed';
  if (value === 'failed') return 'failed';
  if (value === 'submitting') return 'submitting';
  return null;
}

function FileBadge({
  label,
  file,
  uploading,
  onUpload,
  onClear,
  icon,
  accept,
  uploadAction,
  replaceAction,
  removeAction,
  uploadingText,
}: {
  label: string;
  file: VideoStudioUploadedAsset | null;
  uploading: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  icon: ReactNode;
  accept: UploadMediaAccept;
  uploadAction: string;
  replaceAction: string;
  removeAction: string;
  uploadingText: string;
}) {
  const inputId = useMemo(
    () => `studio-upload-${label.replace(/\s+/g, '-').toLowerCase()}`,
    [label]
  );

  return (
    <div className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-700/70 dark:bg-zinc-950/40">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-zinc-200/80 p-1.5 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {icon}
        </span>
        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{label}</p>
      </div>
      <div className="rounded-lg border border-dashed border-zinc-300/80 bg-white/80 px-3 py-2 text-xs text-zinc-600 dark:border-zinc-700/80 dark:bg-zinc-900/70 dark:text-zinc-300">
        {uploading
          ? uploadingText
          : file
            ? `${file.name}`
            : `${uploadAction}`}
      </div>
      <div className="flex items-center gap-2">
        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500"
        >
          <UploadCloud className="h-3.5 w-3.5" />
          {file ? replaceAction : uploadAction}
        </label>
        <input
          id={inputId}
          type="file"
          accept={acceptByType(accept)}
          className="hidden"
          onChange={onUpload}
        />
        {file ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:border-rose-400 hover:text-rose-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-rose-400 dark:hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {removeAction}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function WorkspacePanel({ copy, errors }: WorkspacePanelProps) {
  const searchParams = useSearchParams();
  const { fetchUserCredits, isCheckSign, setIsShowSignModal, user } = useAppContext();
  const [draft, setDraft] = useState<VideoStudioDraft>(() => ({
    ...VIDEO_STUDIO_DEFAULT_DRAFT,
    id: createDraftId(),
    source: 'studio',
  }));
  const [taskLifecycle, setTaskLifecycle] = useState<StudioTaskLifecycle>('idle');
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [guestPendingTaskId, setGuestPendingTaskId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [handoffNotice, setHandoffNotice] = useState<string | null>(null);
  const [uploadingMap, setUploadingMap] = useState<Record<string, boolean>>({});
  const lifecycleRef = useRef<StudioTaskLifecycle>('idle');
  const pollFailureCountRef = useRef(0);
  const hydratedFromEntryRef = useRef(false);
  const lastGeneratingToastTaskIdRef = useRef<string | null>(null);
  const guestHintCooldownRef = useRef(0);
  const isGuestUser = !user && !isCheckSign;

  const notifyGenerating = useCallback((taskId: string) => {
    if (!taskId || lastGeneratingToastTaskIdRef.current === taskId) {
      return;
    }
    lastGeneratingToastTaskIdRef.current = taskId;
    toast.success(copy.generatingToast);
  }, [copy.generatingToast]);

  const notifyGuestGenerateHint = useCallback(() => {
    if (!isGuestUser) return;
    const now = Date.now();
    if (now - guestHintCooldownRef.current < 5_000) return;
    guestHintCooldownRef.current = now;
    toast.message(copy.guestGenerateHint);
  }, [copy.guestGenerateHint, isGuestUser]);

  const updateLifecycle = (nextLifecycle: StudioTaskLifecycle) => {
    lifecycleRef.current = nextLifecycle;
    setTaskLifecycle(nextLifecycle);
  };

  const setUploading = (key: string, value: boolean) => {
    setUploadingMap((prev) => ({ ...prev, [key]: value }));
  };

  const updateDraft = (next: Partial<VideoStudioDraft>) => {
    setDraft((prev) => mergeStudioDraft(prev, next));
  };

  const applyHeroHandoff = (incomingDraft: VideoStudioDraft) => {
    setDraft(incomingDraft);

    const submission = incomingDraft.submission;
    if (submission?.taskId) {
      if (submission.lifecycle === 'completed') {
        updateLifecycle('completed');
        setActiveTaskId(null);
        setGuestPendingTaskId(null);
      } else if (submission.lifecycle === 'failed') {
        updateLifecycle('failed');
        setActiveTaskId(null);
        setGuestPendingTaskId(null);
      } else {
        updateLifecycle(
          submission.lifecycle === 'processing'
            ? 'processing'
            : submission.lifecycle === 'submitting'
              ? 'submitting'
              : 'queued'
        );
        setActiveTaskId(submission.taskId);
        notifyGenerating(submission.taskId);
        if (isGuestUser) {
          setGuestPendingTaskId(submission.taskId);
          notifyGuestGenerateHint();
        }
      }
      dispatchVideoStudioRefresh('submit');
      setHandoffNotice(copy.submitFromHero);
      if (submission.errorMessage) {
        setSubmitError(toStudioErrorMessage(submission.errorMessage, errors, 'submitFailed'));
      } else {
        setSubmitError(null);
      }
      return;
    }

    if (submission?.errorMessage) {
      updateLifecycle('failed');
      setSubmitError(toStudioErrorMessage(submission.errorMessage, errors, 'submitFailed'));
      setActiveTaskId(null);
      setGuestPendingTaskId(null);
      setHandoffNotice(null);
      return;
    }

    updateLifecycle('idle');
    setActiveTaskId(null);
    setGuestPendingTaskId(null);
  };

  useEffect(() => {
    if (hydratedFromEntryRef.current) return;
    hydratedFromEntryRef.current = true;

    const from = searchParams?.get('from');
    const draftId = searchParams?.get('draftId');
    const queryMode = modeFromSearch(searchParams?.get('mode') ?? null);
    const queryI2VMode = i2vModeFromSearch(searchParams?.get('i2vMode') ?? null);
    const queryRatio = (searchParams?.get('ratio') ??
      null) as VideoStudioDraft['ratio'] | null;
    const queryPrompt = searchParams?.get('prompt') ?? '';
    const queryResolution = (searchParams?.get('resolution') ??
      null) as VideoStudioDraft['resolution'] | null;
    const queryDuration = searchParams?.get('duration');
    const queryAudio = (searchParams?.get('audioSetting') ??
      null) as VideoStudioDraft['audioSetting'] | null;
    const handoffLifecycle = parseHandoffLifecycle(searchParams?.get('handoffStatus') ?? null);
    const handoffTaskId = searchParams?.get('taskId');

    let nextDraft = mergeStudioDraft(draft, {
      mode: queryMode ?? draft.mode,
      i2vMode: queryI2VMode ?? draft.i2vMode,
      ratio: queryRatio ?? draft.ratio,
      prompt: queryPrompt || draft.prompt,
      resolution: queryResolution ?? draft.resolution,
      duration: queryDuration ? Number.parseInt(queryDuration, 10) : draft.duration,
      audioSetting: queryAudio ?? draft.audioSetting,
    });

    if (from === 'hero' && draftId) {
      const raw = sessionStorage.getItem(VIDEO_STUDIO_DRAFT_SESSION_KEY);
      if (raw) {
        try {
          const parsed = parseStudioDraftPayload(JSON.parse(raw));
          if (parsed?.id === draftId) {
            nextDraft = mergeStudioDraft(nextDraft, parsed);
          }
        } catch {
          // ignore invalid handoff payload
        }
      }
      sessionStorage.removeItem(VIDEO_STUDIO_DRAFT_SESSION_KEY);
    }

    if (!nextDraft.id) {
      nextDraft.id = createDraftId();
    }
    setDraft(nextDraft);

    if (from === 'hero' && isGuestUser) {
      notifyGuestGenerateHint();
    }

    if (handoffTaskId && handoffLifecycle) {
      updateLifecycle(handoffLifecycle);
      setActiveTaskId(handoffLifecycle === 'completed' ? null : handoffTaskId);
      if (
        handoffLifecycle === 'queued' ||
        handoffLifecycle === 'processing' ||
        handoffLifecycle === 'submitting'
      ) {
        notifyGenerating(handoffTaskId);
        if (isGuestUser) {
          setGuestPendingTaskId(handoffTaskId);
          notifyGuestGenerateHint();
        }
      } else {
        setGuestPendingTaskId(null);
      }
      dispatchVideoStudioRefresh('submit');
      setHandoffNotice(copy.submitFromHero);
      void fetchUserCredits();
      return;
    }

    if (from === 'hero') {
      applyHeroHandoff(nextDraft);
      void fetchUserCredits();
    }
  }, [
    copy.submitFromHero,
    draft,
    errors,
    fetchUserCredits,
    isGuestUser,
    notifyGenerating,
    notifyGuestGenerateHint,
    searchParams,
  ]);

  useEffect(() => {
    if (!isGuestUser) {
      setGuestPendingTaskId(null);
    }
  }, [isGuestUser]);

  useEffect(() => {
    if (!activeTaskId) {
      return;
    }

    let canceled = false;
    const poll = async () => {
      try {
        const task = await queryVideoTask(activeTaskId);
        if (canceled) return;
        pollFailureCountRef.current = 0;
        const nextLifecycle = toLifecycle(task.status);
        const previousLifecycle = lifecycleRef.current;
        updateLifecycle(nextLifecycle);
        if (nextLifecycle === 'failed') {
          setSubmitError(
            task.errorMessage
              ? toStudioErrorMessage(task.errorMessage, errors, 'queryFailed')
              : errors.queryFailed
          );
        } else {
          setSubmitError(null);
        }
        if (nextLifecycle !== previousLifecycle) {
          dispatchVideoStudioRefresh('status');
        }

        if (nextLifecycle === 'completed' || nextLifecycle === 'failed') {
          setActiveTaskId(null);
          setGuestPendingTaskId(null);
          void fetchUserCredits();
        }
      } catch (error: unknown) {
        if (canceled) return;
        const message = toStudioErrorMessage(error, errors, 'queryFailed');
        const isTerminalQueryError =
          message === errors.authRequired ||
          message === errors.permissionDenied ||
          message === errors.taskUnavailable;

        if (isTerminalQueryError) {
          updateLifecycle('failed');
          setSubmitError(message);
          setActiveTaskId(null);
          setGuestPendingTaskId(null);
          dispatchVideoStudioRefresh('status');
          void fetchUserCredits();
          return;
        }

        pollFailureCountRef.current += 1;
        setSubmitError(copy.statusRetrying);

        if (pollFailureCountRef.current >= MAX_POLL_FAILURES) {
          updateLifecycle('failed');
          setSubmitError(
            message === errors.queryFailed ? copy.statusSyncError : message
          );
          setActiveTaskId(null);
          setGuestPendingTaskId(null);
          dispatchVideoStudioRefresh('status');
          void fetchUserCredits();
        }
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
  }, [activeTaskId, copy.statusRetrying, copy.statusSyncError, errors, fetchUserCredits]);

  // Listen for Recreate events dispatched by the Inspiration panel
  useEffect(() => {
    const handleRecreateEvent = async (
      e: CustomEvent<VideoStudioRecreateEventDetail>
    ) => {
      const { mode, prompt, i2vMode, imageUrl } = e.detail;

      // Apply mode + prompt immediately; clear any previous first-frame image
      setDraft((prev) =>
        mergeStudioDraft(prev, { mode, prompt, i2vMode, imageFirstFrame: null })
      );
      setSubmitError(null);
      setHandoffNotice(null);

      // If image-to-video with a reference image, fetch → upload → fill slot
      if (mode === 'image-to-video' && imageUrl) {
        setUploading('imageFirstFrame', true);
        try {
          const res = await fetch(imageUrl);
          const blob = await res.blob();
          const filename = imageUrl.split('/').pop() ?? 'reference.jpg';
          const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
          const assets = await uploadStudioMediaFiles([file]);
          if (assets[0]) {
            setDraft((prev) => mergeStudioDraft(prev, { imageFirstFrame: assets[0] }));
          }
        } catch {
          // CORS or network failure — user can upload manually
        } finally {
          setUploading('imageFirstFrame', false);
        }
      }
    };

    const listener: EventListener = (event) => {
      void handleRecreateEvent(
        event as CustomEvent<VideoStudioRecreateEventDetail>
      );
    };

    window.addEventListener(VIDEO_STUDIO_RECREATE_EVENT, listener);
    return () => window.removeEventListener(VIDEO_STUDIO_RECREATE_EVENT, listener);
  }, []);

  const handleUploadSingle = async (
    key: SingleUploadKey,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setSubmitError(null);
    setUploading(key, true);
    try {
      const uploaded = await uploadStudioMediaFiles([file]);
      if (!uploaded[0]) {
        throw new Error('upload failed');
      }
      updateDraft({ [key]: uploaded[0] } as Partial<VideoStudioDraft>);
    } catch (error: unknown) {
      setSubmitError(toStudioErrorMessage(error, errors, 'submitFailed'));
    } finally {
      setUploading(key, false);
    }
  };

  const handleUploadReferenceMaterials = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!files.length) return;

    setSubmitError(null);
    setUploading('referenceMaterials', true);
    try {
      const existingCount = draft.referenceMaterials.length;
      const capacity = Math.max(0, MAX_REFERENCE_MATERIALS - existingCount);
      if (capacity <= 0) return;
      const targetFiles = files.slice(0, capacity);
      const uploaded = await uploadStudioMediaFiles(targetFiles);
      if (!uploaded.length) {
        throw new Error('upload failed');
      }
      setDraft((prev) =>
        mergeStudioDraft(prev, {
          referenceMaterials: [
            ...prev.referenceMaterials,
            ...uploaded.slice(0, Math.max(0, MAX_REFERENCE_MATERIALS - prev.referenceMaterials.length)),
          ],
        })
      );
    } catch (error: unknown) {
      setSubmitError(toStudioErrorMessage(error, errors, 'submitFailed'));
    } finally {
      setUploading('referenceMaterials', false);
    }
  };

  const handleSubmit = async () => {
    if (activeTaskId) return;
    if (isGuestUser) {
      notifyGuestGenerateHint();
    }

    setSubmitError(null);
    setHandoffNotice(null);
    setGuestPendingTaskId(null);
    pollFailureCountRef.current = 0;
    updateLifecycle('submitting');

    try {
      const payload = buildVideoTaskPayloadFromDraft(draft);
      const task = await generateVideoTask(payload);
      const lifecycle = toLifecycle(task.status);
      updateLifecycle(lifecycle);
      dispatchVideoStudioRefresh('submit');

      if (lifecycle === 'failed') {
        setSubmitError(task.errorMessage || null);
        setActiveTaskId(null);
        setGuestPendingTaskId(null);
      } else {
        setActiveTaskId(lifecycle === 'completed' ? null : task.id);
        if (lifecycle === 'queued' || lifecycle === 'processing') {
          notifyGenerating(task.id);
          if (isGuestUser) {
            setGuestPendingTaskId(task.id);
          }
        }
      }
      await fetchUserCredits();
    } catch (error: unknown) {
      if (error instanceof VideoStudioDraftError) {
        setSubmitError(mapDraftErrorToMessage(error, copy));
      } else {
        setSubmitError(toStudioErrorMessage(error, errors, 'submitFailed'));
      }
      updateLifecycle('failed');
      setActiveTaskId(null);
      setGuestPendingTaskId(null);
      await fetchUserCredits();
    }
  };

  const isSubmittingOrProcessing =
    taskLifecycle === 'submitting' ||
    taskLifecycle === 'queued' ||
    taskLifecycle === 'processing' ||
    Boolean(activeTaskId);
  const hasUploading = useMemo(
    () => Object.values(uploadingMap).some(Boolean),
    [uploadingMap]
  );

  const durationOptions =
    draft.mode === 'video-edit' ? copy.editDurationValues : copy.durationValues;

  const ratioEnabled = draft.mode !== 'image-to-video';
  const showAudioSetting = draft.mode === 'video-edit';
  const showGuestTaskBanner = isGuestUser && Boolean(guestPendingTaskId);

  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-[0_18px_35px_-30px_rgba(15,23,42,0.9)] dark:border-zinc-700/70 dark:bg-zinc-900/70">
      <header className="mb-4 border-b border-dashed border-zinc-200 pb-3 dark:border-zinc-700/60">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:text-zinc-200">
          {copy.panelTitle}
        </h3>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{copy.panelHint}</p>
      </header>

      {showGuestTaskBanner ? (
        <div className="sticky top-2 z-20 mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-300/80 bg-emerald-50/95 px-3 py-2 shadow-sm dark:border-emerald-300/35 dark:bg-emerald-500/12">
          <p className="flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-100">
            <BellRing className="h-3.5 w-3.5 shrink-0" />
            {copy.guestTaskBanner}
          </p>
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0 rounded-full bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-500 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400"
            onClick={() => setIsShowSignModal(true)}
          >
            {copy.guestTaskBannerAction}
          </Button>
        </div>
      ) : null}

      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              {copy.modeLabel}
            </label>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{copy.modeHint}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(copy.modes) as VideoStudioMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => updateDraft({ mode })}
                className={cn(
                  'rounded-lg border px-2 py-2 text-xs font-semibold transition',
                  draft.mode === mode
                    ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900'
                    : 'border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500'
                )}
              >
                {copy.modes[mode]}
              </button>
            ))}
          </div>
        </div>

        {draft.mode === 'image-to-video' ? (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              {copy.i2vModeLabel}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(copy.i2vModes) as VideoStudioI2VMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateDraft({ i2vMode: mode })}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-xs font-semibold transition',
                    draft.i2vMode === mode
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900'
                      : 'border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500'
                  )}
                >
                  {copy.i2vModes[mode]}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {copy.i2vCapabilityHint}
            </p>
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
            {copy.promptLabel}
          </label>
          <Textarea
            value={draft.prompt}
            onChange={(event) => updateDraft({ prompt: event.target.value })}
            placeholder={copy.promptPlaceholder}
            className="min-h-[128px] resize-none border-zinc-300/80 bg-zinc-50 text-sm dark:border-zinc-700/70 dark:bg-zinc-950/80"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              {copy.uploadLabel}
            </label>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">{copy.uploadHint}</span>
          </div>

          {draft.mode === 'text-to-video' ? (
            <FileBadge
              label={copy.uploads.textAudio}
              file={draft.textAudio}
              uploading={Boolean(uploadingMap.textAudio)}
              onUpload={(event) => void handleUploadSingle('textAudio', event)}
              onClear={() => updateDraft({ textAudio: null })}
              icon={<Music2 className="h-3.5 w-3.5" />}
              accept="audio"
              uploadAction={copy.uploads.addFile}
              replaceAction={copy.uploads.replaceFile}
              removeAction={copy.uploads.removeFile}
              uploadingText={copy.uploads.uploading}
            />
          ) : null}

          {draft.mode === 'image-to-video' ? (
            <div className="grid gap-2">
              {draft.i2vMode === 'first-frame' || draft.i2vMode === 'first-last-frame' ? (
                <FileBadge
                  label={copy.uploads.i2vFirstFrame}
                  file={draft.imageFirstFrame}
                  uploading={Boolean(uploadingMap.imageFirstFrame)}
                  onUpload={(event) => void handleUploadSingle('imageFirstFrame', event)}
                  onClear={() => updateDraft({ imageFirstFrame: null })}
                  icon={<ImagePlus className="h-3.5 w-3.5" />}
                  accept="image"
                  uploadAction={copy.uploads.addFile}
                  replaceAction={copy.uploads.replaceFile}
                  removeAction={copy.uploads.removeFile}
                  uploadingText={copy.uploads.uploading}
                />
              ) : null}
              {draft.i2vMode === 'first-last-frame' ? (
                <FileBadge
                  label={copy.uploads.i2vLastFrame}
                  file={draft.imageLastFrame}
                  uploading={Boolean(uploadingMap.imageLastFrame)}
                  onUpload={(event) => void handleUploadSingle('imageLastFrame', event)}
                  onClear={() => updateDraft({ imageLastFrame: null })}
                  icon={<ImagePlus className="h-3.5 w-3.5" />}
                  accept="image"
                  uploadAction={copy.uploads.addFile}
                  replaceAction={copy.uploads.replaceFile}
                  removeAction={copy.uploads.removeFile}
                  uploadingText={copy.uploads.uploading}
                />
              ) : null}
              {draft.i2vMode === 'video-continuation' ? (
                <FileBadge
                  label={copy.uploads.i2vFirstClip}
                  file={draft.imageFirstClip}
                  uploading={Boolean(uploadingMap.imageFirstClip)}
                  onUpload={(event) => void handleUploadSingle('imageFirstClip', event)}
                  onClear={() => updateDraft({ imageFirstClip: null })}
                  icon={<Film className="h-3.5 w-3.5" />}
                  accept="video"
                  uploadAction={copy.uploads.addFile}
                  replaceAction={copy.uploads.replaceFile}
                  removeAction={copy.uploads.removeFile}
                  uploadingText={copy.uploads.uploading}
                />
              ) : null}
              <FileBadge
                label={copy.uploads.i2vAudio}
                file={draft.imageAudio}
                uploading={Boolean(uploadingMap.imageAudio)}
                onUpload={(event) => void handleUploadSingle('imageAudio', event)}
                onClear={() => updateDraft({ imageAudio: null })}
                icon={<Music2 className="h-3.5 w-3.5" />}
                accept="audio"
                uploadAction={copy.uploads.addFile}
                replaceAction={copy.uploads.replaceFile}
                removeAction={copy.uploads.removeFile}
                uploadingText={copy.uploads.uploading}
              />
            </div>
          ) : null}

          {draft.mode === 'reference-to-video' ? (
            <div className="space-y-2">
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3 dark:border-zinc-700/70 dark:bg-zinc-950/40">
                <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {copy.uploads.referenceMaterials}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {copy.uploads.materialLimitHint}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 transition hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500">
                    <UploadCloud className="h-3.5 w-3.5" />
                    {copy.uploads.addFile}
                    <input
                      type="file"
                      accept={acceptByType('image-video')}
                      multiple
                      className="hidden"
                      onChange={(event) => void handleUploadReferenceMaterials(event)}
                    />
                  </label>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    {copy.uploads.materialsCount}: {draft.referenceMaterials.length}/
                    {MAX_REFERENCE_MATERIALS}
                  </span>
                </div>
                {uploadingMap.referenceMaterials ? (
                  <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    {copy.uploads.uploading}
                  </p>
                ) : null}
                {draft.referenceMaterials.length > 0 ? (
                  <div className="mt-3 space-y-1">
                    {draft.referenceMaterials.map((item, index) => (
                      <div
                        key={`${item.url}-${index}`}
                        className="flex items-center justify-between rounded-md border border-zinc-200 bg-white/80 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900/60"
                      >
                        <span className="truncate text-zinc-700 dark:text-zinc-300">
                          [{item.mediaType}] {item.name}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateDraft({
                              referenceMaterials: draft.referenceMaterials.filter(
                                (_, itemIndex) => itemIndex !== index
                              ),
                            })
                          }
                          className="text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-300"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <FileBadge
                  label={copy.uploads.referenceFirstFrame}
                  file={draft.referenceFirstFrame}
                  uploading={Boolean(uploadingMap.referenceFirstFrame)}
                  onUpload={(event) => void handleUploadSingle('referenceFirstFrame', event)}
                  onClear={() => updateDraft({ referenceFirstFrame: null })}
                  icon={<ImagePlus className="h-3.5 w-3.5" />}
                  accept="image"
                  uploadAction={copy.uploads.addFile}
                  replaceAction={copy.uploads.replaceFile}
                  removeAction={copy.uploads.removeFile}
                  uploadingText={copy.uploads.uploading}
                />
                <FileBadge
                  label={copy.uploads.referenceVoice}
                  file={draft.referenceVoice}
                  uploading={Boolean(uploadingMap.referenceVoice)}
                  onUpload={(event) => void handleUploadSingle('referenceVoice', event)}
                  onClear={() => updateDraft({ referenceVoice: null })}
                  icon={<Music2 className="h-3.5 w-3.5" />}
                  accept="audio"
                  uploadAction={copy.uploads.addFile}
                  replaceAction={copy.uploads.replaceFile}
                  removeAction={copy.uploads.removeFile}
                  uploadingText={copy.uploads.uploading}
                />
              </div>
            </div>
          ) : null}

          {draft.mode === 'video-edit' ? (
            <div className="grid gap-2">
              <FileBadge
                label={copy.uploads.editVideo}
                file={draft.editVideo}
                uploading={Boolean(uploadingMap.editVideo)}
                onUpload={(event) => void handleUploadSingle('editVideo', event)}
                onClear={() => updateDraft({ editVideo: null })}
                icon={<Film className="h-3.5 w-3.5" />}
                accept="video"
                uploadAction={copy.uploads.addFile}
                replaceAction={copy.uploads.replaceFile}
                removeAction={copy.uploads.removeFile}
                uploadingText={copy.uploads.uploading}
              />
              <FileBadge
                label={copy.uploads.editReferenceImage}
                file={draft.editReferenceImage}
                uploading={Boolean(uploadingMap.editReferenceImage)}
                onUpload={(event) => void handleUploadSingle('editReferenceImage', event)}
                onClear={() => updateDraft({ editReferenceImage: null })}
                icon={<ImagePlus className="h-3.5 w-3.5" />}
                accept="image"
                uploadAction={copy.uploads.addFile}
                replaceAction={copy.uploads.replaceFile}
                removeAction={copy.uploads.removeFile}
                uploadingText={copy.uploads.uploading}
              />
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              {copy.durationLabel}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {durationOptions.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateDraft({ duration: value })}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs font-semibold transition',
                    draft.duration === value
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900'
                      : 'border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500'
                  )}
                >
                  {value === 0 ? 'Full' : `${value}s`}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              {copy.resolutionLabel}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {copy.resolutionValues.map((value: StudioResolution) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateDraft({ resolution: value })}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs font-semibold transition',
                    draft.resolution === value
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900'
                      : 'border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500'
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        {ratioEnabled ? (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              {copy.ratioLabel}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {STUDIO_ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  type="button"
                  onClick={() => updateDraft({ ratio: ratio.value })}
                  className={cn(
                    'rounded-lg border px-2 py-2 text-xs font-semibold transition',
                    draft.ratio === ratio.value
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900'
                      : 'border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500'
                  )}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {showAudioSetting ? (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
              {copy.audioSettingLabel}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(copy.audioSettings) as StudioAudioSetting[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateDraft({ audioSetting: value })}
                  className={cn(
                    'rounded-md border px-2 py-1 text-xs font-semibold transition',
                    draft.audioSetting === value
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-200 dark:bg-zinc-200 dark:text-zinc-900'
                      : 'border-zinc-300 text-zinc-700 hover:border-zinc-500 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-500'
                  )}
                >
                  {copy.audioSettings[value]}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmittingOrProcessing || hasUploading}
          className="h-10 w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isSubmittingOrProcessing ? (
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
          {handoffNotice ? (
            <p className="text-xs text-sky-700 dark:text-sky-300">{handoffNotice}</p>
          ) : null}
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
