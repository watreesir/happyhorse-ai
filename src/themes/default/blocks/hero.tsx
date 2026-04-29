'use client';

import {
  ChangeEvent,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';
import { ChevronDown, Coins } from 'lucide-react';

import { useRouter } from '@/core/i18n/navigation';
import { AITaskStatus } from '@/extensions/ai/types';
import { useAppContext } from '@/shared/contexts/app';
import {
  ApiResponseError,
  createApiResponseError,
} from '@/shared/lib/api-client';
import { getClientVideoCreditsCost } from '@/shared/lib/client-video-credits';
import { uploadStudioMediaFiles } from '@/shared/lib/media-upload';
import {
  isPromptModerationApiError,
  isPromptModerationDeniedMessage,
  isPromptModerationErrorCode,
} from '@/shared/lib/prompt-moderation-messages';
import { cn } from '@/shared/lib/utils';
import {
  getVideoStudioModelOption,
  isHappyHorseModelKey,
  VIDEO_STUDIO_MODEL_OPTIONS,
  VideoStudioModelKey,
} from '@/shared/lib/video-models';
import {
  buildStudioQueryFromDraft,
  buildVideoTaskPayloadFromDraft,
  VIDEO_STUDIO_DEFAULT_DRAFT,
  VIDEO_STUDIO_DRAFT_SESSION_KEY,
  VideoStudioDraft,
  VideoStudioDraftError,
  VideoStudioMode,
  VideoStudioUploadedAsset,
} from '@/shared/lib/video-studio-workflow';
import { Section } from '@/shared/types/blocks/landing';

// ─── Types ────────────────────────────────────────────────────────────────────

type MainTab = VideoStudioMode;
type I2VMode = 'first-frame' | 'first-last-frame' | 'video-continuation';
type Resolution = '720p' | '1080p';
type Ratio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
type AudioSetting = 'auto' | 'origin';
type OpenParam =
  | 'model'
  | 'mode'
  | 'duration'
  | 'resolution'
  | 'ratio'
  | 'audio'
  | 'seed'
  | null;

type GenerateResponsePayload = {
  code: number;
  message?: string;
  data?: {
    errorCode?: string;
    id: string;
    status: string;
  };
};

interface HeroTab {
  key: string;
  label: string;
  placeholder?: string;
}

// ─── Fallback data ─────────────────────────────────────────────────────────────

const DEFAULT_TABS: HeroTab[] = [
  {
    key: 'text-to-video',
    label: 'Text to Video',
    placeholder: 'Describe the video you want to generate...',
  },
  {
    key: 'image-to-video',
    label: 'Image to Video',
    placeholder: 'Describe how the image should animate...',
  },
  {
    key: 'reference-to-video',
    label: 'Reference to Video',
    placeholder: 'Describe the video style and content...',
  },
  {
    key: 'video-edit',
    label: 'Video Edit',
    placeholder: 'Describe the edits you want to make...',
  },
];

const I2V_MODES: { key: I2VMode; label: string }[] = [
  { key: 'first-frame', label: 'First Frame' },
  { key: 'first-last-frame', label: 'First + Last Frame' },
  { key: 'video-continuation', label: 'Video Continuation' },
];

const RATIOS: { key: Ratio; label: string }[] = [
  { key: '16:9', label: '16:9' },
  { key: '9:16', label: '9:16' },
  { key: '4:3', label: '4:3' },
  { key: '3:4', label: '3:4' },
  { key: '1:1', label: '1:1' },
];

// ─── CompactUploadZone ────────────────────────────────────────────────────────

function CompactUploadZone({
  label,
  shortLabel,
  optional = false,
  file,
  uploading = false,
  accept,
  multiple = false,
  onUpload,
  onClear,
  className,
}: {
  label: string;
  shortLabel?: string;
  optional?: boolean;
  file: VideoStudioUploadedAsset | VideoStudioUploadedAsset[] | null;
  uploading?: boolean;
  accept: string;
  multiple?: boolean;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  className?: string;
}) {
  const hasFile = Array.isArray(file) ? file.length > 0 : Boolean(file?.url);
  const fileLabel = Array.isArray(file)
    ? file.length > 1
      ? `${file.length} files`
      : file[0]?.name
    : file?.name;
  const displayLabel = shortLabel || label;
  const inputId = `hero-compact-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <label
      htmlFor={inputId}
      className={cn(
        'relative flex min-h-[52px] min-w-[88px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed px-2.5 py-2 transition-all duration-200',
        hasFile
          ? 'border-primary/40 bg-primary/8'
          : 'border-foreground/12 bg-background/30 hover:border-primary/35 hover:bg-primary/5 dark:hover:border-primary/40 dark:border-white/12 dark:bg-white/[0.025] dark:hover:bg-white/5',
        className
      )}
    >
      {hasFile ? (
        <div className="flex items-center gap-1">
          <span className="text-primary max-w-[90px] truncate text-[10px] leading-tight font-medium">
            ✓ {fileLabel || displayLabel}
          </span>
          {onClear && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onClear();
              }}
              type="button"
              className="text-foreground/35 hover:text-foreground/70 shrink-0 leading-none dark:text-white/35 dark:hover:text-white/70"
            >
              ×
            </button>
          )}
        </div>
      ) : (
        <>
          <span className="text-foreground/30 text-base leading-none dark:text-white/20">
            {uploading ? '…' : '+'}
          </span>
          <p className="text-foreground/45 text-center text-[10px] leading-tight dark:text-white/38">
            {uploading ? 'Uploading' : displayLabel}
            {!uploading && optional && (
              <span className="text-foreground/28 dark:text-white/22">
                {' '}
                opt
              </span>
            )}
          </p>
        </>
      )}
      <input
        id={inputId}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={onUpload}
        className="hidden"
      />
    </label>
  );
}

// ─── ParamChip ────────────────────────────────────────────────────────────────

function ParamChip({
  onClick,
  isActive = false,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150',
        isActive
          ? 'bg-primary/12 text-primary ring-primary/20 dark:bg-primary/18 dark:text-primary dark:ring-primary/25 ring-1'
          : 'bg-foreground/[0.06] text-foreground/72 hover:bg-foreground/[0.09] hover:text-foreground dark:bg-white/8 dark:text-white/55 dark:hover:bg-white/14 dark:hover:text-white/85'
      )}
    >
      {children}
    </button>
  );
}

// ─── ParamDropdown ─────────────────────────────────────────────────────────────

function ParamDropdown({ children }: { children: ReactNode }) {
  return (
    <div className="border-foreground/10 bg-background/96 absolute bottom-full left-0 z-50 mb-1.5 flex items-center gap-1.5 rounded-xl border px-3 py-2 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95">
      {children}
    </div>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

export function Hero({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const tabs: HeroTab[] = (section as any).tabs || DEFAULT_TABS;
  const generateLabel: string = (section as any).generate_button || 'Generate';
  const badgeText = ((section as any).badge_text ?? 'Happy Horse AI Workflow')
    .toString()
    .trim();
  const defaultTab = ((section as any).default_tab ||
    tabs[0]?.key ||
    'text-to-video') as MainTab;
  const router = useRouter();
  const {
    fetchGuestCredits,
    fetchUserCredits,
    guestCredits,
    isCheckSign,
    setIsShowSignModal,
    user,
  } = useAppContext();

  // Tab state
  const [modelKey, setModelKey] = useState<VideoStudioModelKey>(
    VIDEO_STUDIO_DEFAULT_DRAFT.modelKey
  );
  const [activeTab, setActiveTab] = useState<MainTab>(defaultTab);
  const [prompt, setPrompt] = useState('');
  const [openParam, setOpenParam] = useState<OpenParam>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  // Text to Video
  const [textAudio, setTextAudio] = useState<VideoStudioUploadedAsset | null>(
    null
  );

  // Image to Video
  const [i2vMode, setI2vMode] = useState<I2VMode>('first-frame');
  const [i2vFirstFrame, setI2vFirstFrame] =
    useState<VideoStudioUploadedAsset | null>(null);
  const [i2vLastFrame, setI2vLastFrame] =
    useState<VideoStudioUploadedAsset | null>(null);
  const [i2vClip, setI2vClip] = useState<VideoStudioUploadedAsset | null>(null);
  const [i2vAudio, setI2vAudio] = useState<VideoStudioUploadedAsset | null>(
    null
  );

  // Reference to Video
  const [refMaterials, setRefMaterials] = useState<VideoStudioUploadedAsset[]>(
    []
  );
  const [refFirstFrame, setRefFirstFrame] =
    useState<VideoStudioUploadedAsset | null>(null);
  const [refVoice, setRefVoice] = useState<VideoStudioUploadedAsset | null>(
    null
  );

  // Video Edit
  const [editVideo, setEditVideo] = useState<VideoStudioUploadedAsset | null>(
    null
  );
  const [editRefImage, setEditRefImage] =
    useState<VideoStudioUploadedAsset | null>(null);

  // Shared params
  const [duration, setDuration] = useState(5);
  const [resolution, setResolution] = useState<Resolution>('1080p');
  const [ratio, setRatio] = useState<Ratio>('16:9');
  const [audioSetting, setAudioSetting] = useState<AudioSetting>('auto');
  const [seed, setSeed] = useState('');

  const bottomBarRef = useRef<HTMLDivElement>(null);

  // Close open param when clicking outside the bottom bar
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        bottomBarRef.current &&
        !bottomBarRef.current.contains(e.target as Node)
      ) {
        setOpenParam(null);
      }
    }
    if (openParam !== null) {
      document.addEventListener('mousedown', onClickOutside);
    }
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [openParam]);

  useEffect(() => {
    setActiveTab(defaultTab);
    setPrompt((prev) => prev || '');
    setOpenParam(null);
    setDuration((prev) =>
      normalizeDurationForModel(modelKey, defaultTab, prev)
    );
  }, [defaultTab, modelKey]);

  function normalizeDurationForModel(
    nextModelKey: VideoStudioModelKey,
    mode: MainTab,
    currentDuration: number
  ) {
    if (isHappyHorseModelKey(nextModelKey)) {
      if (mode === 'video-edit') return 0;
      return currentDuration >= 3 && currentDuration <= 15
        ? currentDuration
        : 5;
    }
    if (mode === 'video-edit') {
      return currentDuration === 0 ||
        currentDuration === 5 ||
        currentDuration === 10
        ? currentDuration
        : 0;
    }
    return currentDuration === 0 ? 5 : currentDuration;
  }

  function switchModel(nextModelKey: VideoStudioModelKey) {
    setModelKey(nextModelKey);
    setOpenParam(null);
    setDuration((prev) =>
      normalizeDurationForModel(nextModelKey, activeTab, prev)
    );
    if (isHappyHorseModelKey(nextModelKey)) {
      setI2vMode('first-frame');
      setTextAudio(null);
      setI2vLastFrame(null);
      setI2vClip(null);
      setI2vAudio(null);
      setRefFirstFrame(null);
      setRefVoice(null);
      setRefMaterials((prev) =>
        prev.filter((item) => item.mediaType === 'image').slice(0, 9)
      );
    }
  }

  function switchTab(key: string) {
    const nextMode = key as MainTab;
    setActiveTab(nextMode);
    setOpenParam(null);
    setDuration((prev) => normalizeDurationForModel(modelKey, nextMode, prev));
  }

  const setUploadingState = (key: string, value: boolean) => {
    setUploading((prev) => ({ ...prev, [key]: value }));
  };

  const uploadSingle = async (
    key: string,
    event: ChangeEvent<HTMLInputElement>,
    onUploaded: (asset: VideoStudioUploadedAsset | null) => void
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingState(key, true);
    setStatusHint(null);
    try {
      const uploaded = await uploadStudioMediaFiles([file]);
      onUploaded(uploaded[0] ?? null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'upload failed';
      setStatusHint(message);
    } finally {
      setUploadingState(key, false);
    }
  };

  const uploadMultiple = async (
    key: string,
    event: ChangeEvent<HTMLInputElement>,
    onUploaded: (assets: VideoStudioUploadedAsset[]) => void,
    maxCount?: number
  ) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;

    setUploadingState(key, true);
    setStatusHint(null);
    try {
      const uploaded = await uploadStudioMediaFiles(
        typeof maxCount === 'number' ? files.slice(0, maxCount) : files
      );
      onUploaded(uploaded);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'upload failed';
      setStatusHint(message);
    } finally {
      setUploadingState(key, false);
    }
  };

  const mapStatusToLifecycle = (status: string | undefined) => {
    if (status === AITaskStatus.SUCCESS) return 'completed' as const;
    if (status === AITaskStatus.PROCESSING) return 'processing' as const;
    if (status === AITaskStatus.PENDING) return 'queued' as const;
    return 'failed' as const;
  };

  const createDraft = (
    submission: VideoStudioDraft['submission']
  ): VideoStudioDraft => {
    return {
      ...VIDEO_STUDIO_DEFAULT_DRAFT,
      id: `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      source: 'hero',
      modelKey,
      mode: activeTab,
      prompt,
      ratio,
      resolution,
      duration,
      seed,
      i2vMode,
      audioSetting,
      textAudio,
      imageAudio: i2vAudio,
      imageFirstFrame: i2vFirstFrame,
      imageLastFrame: i2vLastFrame,
      imageFirstClip: i2vClip,
      referenceMaterials: refMaterials,
      referenceFirstFrame: refFirstFrame,
      referenceVoice: refVoice,
      editVideo,
      editReferenceImage: editRefImage,
      submission,
    };
  };

  const redirectToStudio = (draft: VideoStudioDraft) => {
    sessionStorage.setItem(
      VIDEO_STUDIO_DRAFT_SESSION_KEY,
      JSON.stringify(draft)
    );
    const params = buildStudioQueryFromDraft(draft);
    if (draft.submission?.taskId) {
      params.set('taskId', draft.submission.taskId);
      params.set('handoffStatus', draft.submission.lifecycle);
    }
    router.push(`/ai-video-studio?${params.toString()}`);
  };

  const redirectToPricing = () => {
    router.push('/pricing?focus=subscriptions&notice=credits-required');
  };

  const formatDraftValidationError = (error: VideoStudioDraftError) => {
    if (error.code === 'PROMPT_REQUIRED') {
      return 'Please add a prompt before generating.';
    }
    if (error.code === 'IMAGE_FIRST_FRAME_REQUIRED') {
      return 'Upload a first frame image before generating.';
    }
    if (error.code === 'IMAGE_FIRST_LAST_FRAME_REQUIRED') {
      return 'Upload both first and last frame images.';
    }
    if (error.code === 'IMAGE_FIRST_CLIP_REQUIRED') {
      return 'Upload a clip for continuation mode.';
    }
    if (error.code === 'REFERENCE_MATERIAL_REQUIRED') {
      return 'Upload at least one reference image or video.';
    }
    if (error.code === 'REFERENCE_IMAGE_REQUIRED') {
      return error.message || 'Upload at least one reference image.';
    }
    if (error.code === 'SEED_INVALID') {
      return error.message || 'Seed must be an integer from 0 to 2147483647.';
    }
    return 'Upload a source video before editing.';
  };

  const handleGenerate = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatusHint(null);

    try {
      const isGuestUser = !user && !isCheckSign;

      const draft = createDraft(null);
      const payload = buildVideoTaskPayloadFromDraft(draft);
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw await createApiResponseError(response);
      }

      const result = (await response.json()) as GenerateResponsePayload;
      if (result.code !== 0 || !result.data?.id) {
        if (isPromptModerationErrorCode(result.data?.errorCode)) {
          throw new ApiResponseError({
            message: result.message || 'generate failed',
            status: response.status,
            code: result.code,
            data: result.data,
            errorCode: result.data?.errorCode,
          });
        }
        throw new Error(result.message || 'generate failed');
      }

      const handoff = createDraft({
        taskId: result.data.id,
        lifecycle: mapStatusToLifecycle(result.data.status),
        errorMessage: null,
      });
      if (isGuestUser) {
        await fetchGuestCredits();
      } else {
        await fetchUserCredits();
      }
      redirectToStudio(handoff);
    } catch (error) {
      const message =
        error instanceof VideoStudioDraftError
          ? formatDraftValidationError(error)
          : error instanceof Error
            ? error.message
            : 'generate failed';

      const normalizedMessage = message.trim().toLowerCase();
      const isInsufficientCredits =
        normalizedMessage.includes('insufficient credits') ||
        normalizedMessage.includes('积分不足');
      const shouldPromptSignIn =
        isInsufficientCredits ||
        normalizedMessage.includes('guest trial exhausted') ||
        normalizedMessage.includes('guest trial risk blocked');

      if (shouldPromptSignIn) {
        if (!user) {
          await fetchGuestCredits();
        } else {
          await fetchUserCredits();
        }
        redirectToPricing();
        return;
      }

      if (normalizedMessage.includes('no auth')) {
        setIsShowSignModal(true);
        return;
      }

      if (
        isPromptModerationApiError(error) ||
        isPromptModerationDeniedMessage(message)
      ) {
        setStatusHint(message);
        await fetchUserCredits();
        return;
      }

      const failedDraft = createDraft({
        taskId: null,
        lifecycle: 'failed',
        errorMessage: message,
      });
      await fetchUserCredits();
      redirectToStudio(failedDraft);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Title highlight rendered with the active brand accent.
  const highlightText = section.highlight_text ?? '';
  let titleParts: string[] | null = null;
  if (highlightText && section.title?.includes(highlightText)) {
    titleParts = section.title.split(highlightText, 2);
  }

  const isHappyHorse = isHappyHorseModelKey(modelKey);
  const modelOption = getVideoStudioModelOption(modelKey);
  const durationLabel =
    isHappyHorse && activeTab === 'video-edit'
      ? 'Source'
      : duration === 0
        ? 'Full'
        : `${duration}s`;
  const showRatio =
    activeTab !== 'image-to-video' &&
    !(isHappyHorse && activeTab === 'video-edit');
  const maxReferenceMaterials = isHappyHorse ? 9 : 5;
  const referenceAccept = isHappyHorse ? 'image/*' : 'image/*,video/*';
  const hasUploading = Object.values(uploading).some(Boolean);
  const estimatedDurationSeconds =
    isHappyHorse && activeTab === 'video-edit'
      ? Math.min(15, Math.max(3, editVideo?.durationSeconds || 15))
      : duration || 5;
  const estimatedTaskCostCredits = useMemo(
    () =>
      getClientVideoCreditsCost({
        resolution,
        durationSeconds: estimatedDurationSeconds,
        modelKey,
      }),
    [estimatedDurationSeconds, modelKey, resolution]
  );
  const placeholder =
    tabs.find((t) => t.key === activeTab)?.placeholder ??
    'Describe your video...';
  const activeTabLabel =
    tabs.find((t) => t.key === activeTab)?.label ?? 'Text to Video';

  const durationOptions = isHappyHorse
    ? activeTab === 'video-edit'
      ? [{ label: 'Source', value: 0 }]
      : [3, 5, 8, 10, 15].map((d) => ({ label: `${d}s`, value: d }))
    : activeTab === 'video-edit'
      ? [
          { label: 'Full', value: 0 },
          { label: '5s', value: 5 },
          { label: '10s', value: 10 },
        ]
      : [2, 5, 8, 10].map((d) => ({ label: `${d}s`, value: d }));

  // Shared option chip styles
  const optBase =
    'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 cursor-pointer whitespace-nowrap';
  const optActive = 'bg-primary text-primary-foreground font-semibold';
  const optInactive =
    'bg-foreground/[0.06] text-foreground/68 hover:bg-foreground/[0.09] hover:text-foreground dark:bg-white/8 dark:text-white/55 dark:hover:bg-white/14 dark:hover:text-white/85';

  return (
    <section
      id={section.id}
      className={cn(
        'relative isolate z-[40] flex min-h-screen flex-col items-center justify-center overflow-visible',
        className
      )}
    >
      {/* ── Full-screen video background ────────────────────────────────────── */}
      <div className="absolute inset-0 -z-10 bg-[color:var(--landing-shell)] dark:bg-zinc-950">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover opacity-75 saturate-[0.9] dark:opacity-60 dark:saturate-100"
        >
          <source src="/video/hero_video.mp4" type="video/mp4" />
          {section.background_image?.src && (
            <Image
              src={section.background_image.src}
              alt={section.background_image.alt || ''}
              className="object-cover"
              fill
              priority
              quality={80}
              unoptimized={section.background_image.src.startsWith('http')}
            />
          )}
        </video>
        {/* Cinematic gradient overlay */}
        <div className="from-background/5 via-background/15 to-background/45 absolute inset-0 bg-gradient-to-b dark:from-zinc-950/30 dark:via-transparent dark:to-zinc-950/80" />
        {/* Soft accent vignette */}
        <div
          className="absolute inset-0 opacity-70 dark:opacity-15"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 100%, color-mix(in oklab, var(--primary) 18%, transparent) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10 w-full max-w-[58rem] px-4 pt-24 pb-16 text-center">
        {/* Badge */}
        {badgeText && (
          <div className="border-primary/18 bg-background/70 dark:bg-primary/10 mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 shadow-sm backdrop-blur-sm">
            <span className="bg-primary h-1.5 w-1.5 rounded-full shadow-[0_0_6px_color-mix(in_oklab,var(--color-primary)_55%,transparent)]" />
            <span className="text-foreground/78 dark:text-primary/85 text-xs font-medium tracking-wide">
              {badgeText}
            </span>
          </div>
        )}

        {/* Title */}
        {titleParts && titleParts.length > 0 ? (
          <h1 className="text-foreground mb-5 text-4xl leading-tight font-bold tracking-tight text-balance sm:text-6xl dark:text-white">
            {titleParts[0]}
            <span className="text-primary whitespace-nowrap">
              {highlightText}
            </span>
            {titleParts[1]}
          </h1>
        ) : (
          <h1 className="text-foreground mb-5 text-4xl leading-tight font-bold tracking-tight text-balance sm:text-6xl dark:text-white">
            {section.title}
          </h1>
        )}

        {/* Description */}
        {section.description && (
          <p
            className="text-foreground/74 mx-auto mb-10 max-w-xl text-base leading-relaxed sm:text-lg dark:text-white/64"
            dangerouslySetInnerHTML={{ __html: section.description }}
          />
        )}

        {/* ── Input card ────────────────────────────────────────────────────── */}
        <div className="border-foreground/10 bg-background/72 relative mx-auto w-full max-w-[58rem] rounded-2xl border p-5 shadow-[0_18px_48px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-shadow duration-300 dark:border-white/10 dark:bg-white/5 dark:shadow-[0_0_0_1px_rgba(16,185,129,0.08),0_8px_32px_rgba(0,0,0,0.25)]">
          {/* ── Text to Video uploads ──────────────────────────────────────── */}
          {activeTab === 'text-to-video' && !isHappyHorse && (
            <div className="mb-3 flex flex-wrap gap-2">
              <CompactUploadZone
                label="Optional audio track (mp3 / wav)"
                shortLabel="Audio track"
                optional
                file={textAudio}
                uploading={Boolean(uploading.textAudio)}
                accept="audio/*"
                onUpload={(event) =>
                  void uploadSingle('textAudio', event, setTextAudio)
                }
                onClear={() => setTextAudio(null)}
              />
            </div>
          )}

          {/* ── Image to Video uploads ─────────────────────────────────────── */}
          {activeTab === 'image-to-video' && (
            <div className="mb-3 space-y-2">
              {/* Sub-tabs */}
              {!isHappyHorse && (
                <div className="flex flex-wrap gap-1.5">
                  {I2V_MODES.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => {
                        setI2vMode(m.key);
                        setI2vFirstFrame(null);
                        setI2vLastFrame(null);
                        setI2vClip(null);
                      }}
                      className={cn(
                        'rounded-full px-3 py-1 text-xs font-medium transition-all duration-150',
                        i2vMode === m.key
                          ? 'bg-primary text-primary-foreground font-semibold'
                          : 'bg-foreground/[0.06] text-foreground/68 hover:bg-foreground/[0.09] hover:text-foreground dark:bg-white/8 dark:text-white/55 dark:hover:bg-white/15 dark:hover:text-white/85'
                      )}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-foreground/50 px-0.5 text-left text-[11px] dark:text-white/45">
                Image-to-video follows source framing; manual aspect ratio is
                not supported.
              </p>
              {/* Compact upload slots */}
              <div className="flex flex-wrap gap-2">
                {i2vMode === 'first-frame' && (
                  <CompactUploadZone
                    label="Upload first frame image"
                    shortLabel="First frame"
                    file={i2vFirstFrame}
                    uploading={Boolean(uploading.i2vFirstFrame)}
                    accept="image/*"
                    onUpload={(event) =>
                      void uploadSingle(
                        'i2vFirstFrame',
                        event,
                        setI2vFirstFrame
                      )
                    }
                    onClear={() => setI2vFirstFrame(null)}
                  />
                )}
                {i2vMode === 'first-last-frame' && (
                  <>
                    <CompactUploadZone
                      label="First frame image"
                      shortLabel="First frame"
                      file={i2vFirstFrame}
                      uploading={Boolean(uploading.i2vFirstFrame)}
                      accept="image/*"
                      onUpload={(event) =>
                        void uploadSingle(
                          'i2vFirstFrame',
                          event,
                          setI2vFirstFrame
                        )
                      }
                      onClear={() => setI2vFirstFrame(null)}
                    />
                    <CompactUploadZone
                      label="Last frame image"
                      shortLabel="Last frame"
                      file={i2vLastFrame}
                      uploading={Boolean(uploading.i2vLastFrame)}
                      accept="image/*"
                      onUpload={(event) =>
                        void uploadSingle(
                          'i2vLastFrame',
                          event,
                          setI2vLastFrame
                        )
                      }
                      onClear={() => setI2vLastFrame(null)}
                    />
                  </>
                )}
                {i2vMode === 'video-continuation' && (
                  <CompactUploadZone
                    label="Upload video clip (mp4 / mov)"
                    shortLabel="Video clip"
                    file={i2vClip}
                    uploading={Boolean(uploading.i2vClip)}
                    accept="video/*"
                    onUpload={(event) =>
                      void uploadSingle('i2vClip', event, setI2vClip)
                    }
                    onClear={() => setI2vClip(null)}
                  />
                )}
                {!isHappyHorse && (
                  <CompactUploadZone
                    label="Optional driving audio (mp3 / wav)"
                    shortLabel="Driving audio"
                    optional
                    file={i2vAudio}
                    uploading={Boolean(uploading.i2vAudio)}
                    accept="audio/*"
                    onUpload={(event) =>
                      void uploadSingle('i2vAudio', event, setI2vAudio)
                    }
                    onClear={() => setI2vAudio(null)}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Reference to Video uploads ─────────────────────────────────── */}
          {activeTab === 'reference-to-video' && (
            <div className="mb-3 flex flex-wrap gap-2">
              <CompactUploadZone
                label={
                  isHappyHorse
                    ? 'Add reference images (up to 9)'
                    : 'Add reference images or videos (up to 5)'
                }
                shortLabel={isHappyHorse ? 'Ref images' : 'Ref images / videos'}
                file={refMaterials}
                uploading={Boolean(uploading.refMaterials)}
                accept={referenceAccept}
                multiple
                onUpload={(event) =>
                  void uploadMultiple(
                    'refMaterials',
                    event,
                    (assets) => {
                      setRefMaterials((prev) =>
                        [
                          ...prev,
                          ...(isHappyHorse
                            ? assets.filter(
                                (item) => item.mediaType === 'image'
                              )
                            : assets),
                        ].slice(0, maxReferenceMaterials)
                      );
                    },
                    Math.max(0, maxReferenceMaterials - refMaterials.length)
                  )
                }
                onClear={() => setRefMaterials([])}
                className="min-w-[120px]"
              />
              {!isHappyHorse && (
                <>
                  <CompactUploadZone
                    label="First frame image"
                    shortLabel="First frame"
                    optional
                    file={refFirstFrame}
                    uploading={Boolean(uploading.refFirstFrame)}
                    accept="image/*"
                    onUpload={(event) =>
                      void uploadSingle(
                        'refFirstFrame',
                        event,
                        setRefFirstFrame
                      )
                    }
                    onClear={() => setRefFirstFrame(null)}
                  />
                  <CompactUploadZone
                    label="Reference voice (wav / mp3)"
                    shortLabel="Ref voice"
                    optional
                    file={refVoice}
                    uploading={Boolean(uploading.refVoice)}
                    accept="audio/*"
                    onUpload={(event) =>
                      void uploadSingle('refVoice', event, setRefVoice)
                    }
                    onClear={() => setRefVoice(null)}
                  />
                </>
              )}
            </div>
          )}

          {/* ── Video Edit uploads ─────────────────────────────────────────── */}
          {activeTab === 'video-edit' && (
            <div className="mb-3 flex flex-wrap gap-2">
              <CompactUploadZone
                label={
                  isHappyHorse
                    ? 'Upload video to edit (mp4 / mov, 3–60s)'
                    : 'Upload video to edit (mp4 / mov, 2–10s)'
                }
                shortLabel="Video to edit"
                file={editVideo}
                uploading={Boolean(uploading.editVideo)}
                accept="video/*"
                onUpload={(event) =>
                  void uploadSingle('editVideo', event, setEditVideo)
                }
                onClear={() => setEditVideo(null)}
                className="min-w-[110px]"
              />
              <CompactUploadZone
                label="Reference image — style or character"
                shortLabel="Reference image"
                optional
                file={editRefImage}
                uploading={Boolean(uploading.editRefImage)}
                accept="image/*"
                onUpload={(event) =>
                  void uploadSingle('editRefImage', event, setEditRefImage)
                }
                onClear={() => setEditRefImage(null)}
              />
            </div>
          )}

          {/* Prompt textarea */}
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            className="text-foreground/90 placeholder:text-foreground/35 mb-3 max-h-[280px] min-h-[120px] w-full resize-none !bg-transparent text-sm leading-relaxed outline-none dark:text-white/90 dark:placeholder:text-white/28"
            rows={5}
          />

          {/* Divider */}
          <div className="bg-foreground/10 mb-3 h-px dark:bg-white/6" />

          {/* ── Bottom toolbar ─────────────────────────────────────────────── */}
          <div ref={bottomBarRef} className="relative">
            <div className="flex items-center gap-2">
              {/* Param chips */}
              <div
                className={cn(
                  'flex min-w-0 flex-1 flex-nowrap gap-1.5 pb-1',
                  openParam === null
                    ? 'overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                    : 'overflow-visible'
                )}
              >
                {/* Model selector */}
                <div className="relative">
                  <ParamChip
                    onClick={() =>
                      setOpenParam(openParam === 'model' ? null : 'model')
                    }
                    isActive={openParam === 'model'}
                  >
                    <span>{modelOption.label}</span>
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 opacity-55 transition-transform duration-150',
                        openParam === 'model' && 'rotate-180'
                      )}
                    />
                  </ParamChip>
                  {openParam === 'model' && (
                    <div className="border-foreground/10 bg-background/96 absolute bottom-full left-0 z-50 mb-1.5 min-w-[170px] overflow-hidden rounded-xl border shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95">
                      {VIDEO_STUDIO_MODEL_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          onClick={() => switchModel(option.key)}
                          className={cn(
                            'w-full px-4 py-2.5 text-left text-xs font-medium transition-colors',
                            modelKey === option.key
                              ? 'text-primary bg-primary/8'
                              : 'text-foreground/72 hover:bg-foreground/[0.05] hover:text-foreground dark:text-white/58 dark:hover:bg-white/6 dark:hover:text-white/90'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mode selector */}
                <div className="relative">
                  <ParamChip
                    onClick={() =>
                      setOpenParam(openParam === 'mode' ? null : 'mode')
                    }
                    isActive={openParam === 'mode'}
                  >
                    <span>{activeTabLabel}</span>
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 opacity-55 transition-transform duration-150',
                        openParam === 'mode' && 'rotate-180'
                      )}
                    />
                  </ParamChip>
                  {openParam === 'mode' && (
                    <div className="border-foreground/10 bg-background/96 absolute bottom-full left-0 z-50 mb-1.5 min-w-[160px] overflow-hidden rounded-xl border shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95">
                      {tabs.map((tab) => (
                        <button
                          key={tab.key}
                          onClick={() => {
                            switchTab(tab.key);
                          }}
                          className={cn(
                            'w-full px-4 py-2.5 text-left text-xs font-medium transition-colors',
                            activeTab === tab.key
                              ? 'text-primary bg-primary/8'
                              : 'text-foreground/72 hover:bg-foreground/[0.05] hover:text-foreground dark:text-white/58 dark:hover:bg-white/6 dark:hover:text-white/90'
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div className="relative">
                  <ParamChip
                    onClick={() =>
                      setOpenParam(openParam === 'duration' ? null : 'duration')
                    }
                    isActive={openParam === 'duration'}
                  >
                    <svg
                      className="h-3 w-3 opacity-55"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm.75 4a.75.75 0 0 0-1.5 0v3.25l-1.97 1.97a.75.75 0 1 0 1.06 1.06l2.25-2.25A.75.75 0 0 0 8.75 9V5z" />
                    </svg>
                    <span>{durationLabel}</span>
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 opacity-55 transition-transform duration-150',
                        openParam === 'duration' && 'rotate-180'
                      )}
                    />
                  </ParamChip>
                  {openParam === 'duration' && (
                    <ParamDropdown>
                      {durationOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setDuration(opt.value);
                            setOpenParam(null);
                          }}
                          className={cn(
                            optBase,
                            duration === opt.value ? optActive : optInactive
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </ParamDropdown>
                  )}
                </div>

                {/* Resolution */}
                <div className="relative">
                  <ParamChip
                    onClick={() =>
                      setOpenParam(
                        openParam === 'resolution' ? null : 'resolution'
                      )
                    }
                    isActive={openParam === 'resolution'}
                  >
                    <svg
                      className="h-3 w-3 opacity-55"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                    >
                      <path d="M2 2h12v12H2V2zm1.5 1.5v9h9v-9h-9z" />
                    </svg>
                    <span>{resolution}</span>
                    <ChevronDown
                      className={cn(
                        'h-3 w-3 opacity-55 transition-transform duration-150',
                        openParam === 'resolution' && 'rotate-180'
                      )}
                    />
                  </ParamChip>
                  {openParam === 'resolution' && (
                    <ParamDropdown>
                      {(['720p', '1080p'] as Resolution[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setResolution(r);
                            setOpenParam(null);
                          }}
                          className={cn(
                            optBase,
                            resolution === r ? optActive : optInactive
                          )}
                        >
                          {r}
                        </button>
                      ))}
                    </ParamDropdown>
                  )}
                </div>

                {/* Aspect Ratio — hidden for Image to Video */}
                {showRatio && (
                  <div className="relative">
                    <ParamChip
                      onClick={() =>
                        setOpenParam(openParam === 'ratio' ? null : 'ratio')
                      }
                      isActive={openParam === 'ratio'}
                    >
                      <svg
                        className="h-3 w-3 opacity-55"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <rect
                          x="1"
                          y="4"
                          width="14"
                          height="8"
                          rx="1.5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                      <span>{ratio}</span>
                      <ChevronDown
                        className={cn(
                          'h-3 w-3 opacity-55 transition-transform duration-150',
                          openParam === 'ratio' && 'rotate-180'
                        )}
                      />
                    </ParamChip>
                    {openParam === 'ratio' && (
                      <ParamDropdown>
                        {RATIOS.map((r) => (
                          <button
                            key={r.key}
                            onClick={() => {
                              setRatio(r.key);
                              setOpenParam(null);
                            }}
                            className={cn(
                              optBase,
                              ratio === r.key ? optActive : optInactive
                            )}
                          >
                            {r.label}
                          </button>
                        ))}
                      </ParamDropdown>
                    )}
                  </div>
                )}

                {/* Audio — Video Edit only */}
                {activeTab === 'video-edit' && (
                  <div className="relative">
                    <ParamChip
                      onClick={() =>
                        setOpenParam(openParam === 'audio' ? null : 'audio')
                      }
                      isActive={openParam === 'audio'}
                    >
                      <svg
                        className="h-3 w-3 opacity-55"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M8 1a3 3 0 0 0-3 3v4a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM4 10a4 4 0 0 0 8 0H11a3 3 0 0 1-6 0H4zm3 5h2v-1.07A5.01 5.01 0 0 0 13 9.5h-1a4 4 0 0 1-8 0H3a5.01 5.01 0 0 0 4 4.43V15z" />
                      </svg>
                      <span>
                        {audioSetting === 'auto' ? 'AI Audio' : 'Original'}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-3 w-3 opacity-55 transition-transform duration-150',
                          openParam === 'audio' && 'rotate-180'
                        )}
                      />
                    </ParamChip>
                    {openParam === 'audio' && (
                      <ParamDropdown>
                        {(
                          [
                            ['auto', 'AI Audio'],
                            ['origin', 'Keep Original'],
                          ] as [AudioSetting, string][]
                        ).map(([val, label]) => (
                          <button
                            key={val}
                            onClick={() => {
                              setAudioSetting(val);
                              setOpenParam(null);
                            }}
                            className={cn(
                              optBase,
                              audioSetting === val ? optActive : optInactive
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </ParamDropdown>
                    )}
                  </div>
                )}

                {/* Seed — HappyHorse only */}
                {isHappyHorse && (
                  <div className="relative">
                    <ParamChip
                      onClick={() =>
                        setOpenParam(openParam === 'seed' ? null : 'seed')
                      }
                      isActive={openParam === 'seed'}
                    >
                      <span>{seed ? `Seed ${seed}` : 'Seed'}</span>
                      <ChevronDown
                        className={cn(
                          'h-3 w-3 opacity-55 transition-transform duration-150',
                          openParam === 'seed' && 'rotate-180'
                        )}
                      />
                    </ParamChip>
                    {openParam === 'seed' && (
                      <div className="border-foreground/10 bg-background/96 absolute bottom-full left-0 z-50 mb-1.5 w-[280px] rounded-xl border p-3 text-left shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95">
                        <input
                          value={seed}
                          onChange={(event) => {
                            const value = event.target.value.trim();
                            if (value === '' || /^\d+$/.test(value)) {
                              setSeed(value.slice(0, 10));
                            }
                          }}
                          inputMode="numeric"
                          placeholder="0"
                          className="border-foreground/10 bg-background focus:border-primary/60 w-full rounded-lg border px-3 py-2 text-xs outline-none dark:border-white/10 dark:bg-zinc-900"
                        />
                        <p className="text-foreground/55 mt-2 text-[11px] leading-4 dark:text-white/45">
                          Random initialization value, ranging from 0 to
                          2147483647. Leave it blank for automatic system
                          assignment. Locking this value helps stabilize
                          generation results, though minor differences may still
                          occur due to the model&apos;s inherent randomness.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerate}
                disabled={isSubmitting || hasUploading}
                className="bg-primary text-primary-foreground hover:bg-primary/92 shrink-0 rounded-xl px-5 py-2 text-sm font-semibold shadow-lg transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  '...'
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    <span>✦ {generateLabel}</span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/15 px-1.5 py-0.5 text-[11px] tabular-nums">
                      <Coins className="h-3 w-3" />
                      {estimatedTaskCostCredits}
                    </span>
                  </span>
                )}
              </button>
            </div>

            {statusHint && (
              <p className="mt-2 text-left text-xs text-rose-500 dark:text-rose-300">
                {statusHint}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
