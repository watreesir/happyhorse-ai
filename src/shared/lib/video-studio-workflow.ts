import { AIMediaType } from '@/extensions/ai/types';

export type VideoStudioMode =
  | 'text-to-video'
  | 'image-to-video'
  | 'reference-to-video'
  | 'video-edit';

export type VideoStudioI2VMode =
  | 'first-frame'
  | 'first-last-frame'
  | 'video-continuation';

export type VideoStudioResolution = '720p' | '1080p';

export type VideoStudioRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';

export type VideoStudioAudioSetting = 'auto' | 'origin';

export type VideoStudioMediaType = 'image' | 'video' | 'audio';

export type VideoStudioUploadedAsset = {
  url: string;
  name: string;
  mimeType: string;
  mediaType: VideoStudioMediaType;
};

export type VideoStudioSubmissionLifecycle =
  | 'idle'
  | 'submitting'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed';

export type VideoStudioSubmissionDraft = {
  taskId: string | null;
  lifecycle: VideoStudioSubmissionLifecycle;
  errorMessage: string | null;
};

export type VideoStudioDraft = {
  version: 1;
  id: string;
  source: 'hero' | 'studio';
  mode: VideoStudioMode;
  prompt: string;
  ratio: VideoStudioRatio;
  resolution: VideoStudioResolution;
  duration: number;
  i2vMode: VideoStudioI2VMode;
  audioSetting: VideoStudioAudioSetting;
  textAudio: VideoStudioUploadedAsset | null;
  imageAudio: VideoStudioUploadedAsset | null;
  imageFirstFrame: VideoStudioUploadedAsset | null;
  imageLastFrame: VideoStudioUploadedAsset | null;
  imageFirstClip: VideoStudioUploadedAsset | null;
  referenceMaterials: VideoStudioUploadedAsset[];
  referenceFirstFrame: VideoStudioUploadedAsset | null;
  referenceVoice: VideoStudioUploadedAsset | null;
  editVideo: VideoStudioUploadedAsset | null;
  editReferenceImage: VideoStudioUploadedAsset | null;
  submission: VideoStudioSubmissionDraft | null;
};

export type VideoStudioDraftErrorCode =
  | 'PROMPT_REQUIRED'
  | 'IMAGE_FIRST_FRAME_REQUIRED'
  | 'IMAGE_FIRST_LAST_FRAME_REQUIRED'
  | 'IMAGE_FIRST_CLIP_REQUIRED'
  | 'REFERENCE_MATERIAL_REQUIRED'
  | 'EDIT_VIDEO_REQUIRED';

export class VideoStudioDraftError extends Error {
  code: VideoStudioDraftErrorCode;

  constructor(code: VideoStudioDraftErrorCode, message?: string) {
    super(message || code);
    this.name = 'VideoStudioDraftError';
    this.code = code;
  }
}

export type VideoStudioGeneratePayload = {
  mediaType: AIMediaType.VIDEO;
  scene: 'text-to-video' | 'image-to-video' | 'video-to-video';
  provider: string;
  model: string;
  prompt: string;
  options: Record<string, unknown>;
};

export const VIDEO_STUDIO_PROVIDER = 'kie';

export const VIDEO_STUDIO_MODELS: Record<VideoStudioMode, string> = {
  'text-to-video': 'wan/2-7-text-to-video',
  'image-to-video': 'wan/2-7-image-to-video',
  'reference-to-video': 'wan/2-7-r2v',
  'video-edit': 'wan/2-7-videoedit',
};

export const VIDEO_STUDIO_DRAFT_SESSION_KEY = 'video-studio:entry-draft';

export const VIDEO_STUDIO_DEFAULT_DRAFT: VideoStudioDraft = {
  version: 1,
  id: '',
  source: 'studio',
  mode: 'text-to-video',
  prompt: '',
  ratio: '16:9',
  resolution: '1080p',
  duration: 5,
  i2vMode: 'first-frame',
  audioSetting: 'auto',
  textAudio: null,
  imageAudio: null,
  imageFirstFrame: null,
  imageLastFrame: null,
  imageFirstClip: null,
  referenceMaterials: [],
  referenceFirstFrame: null,
  referenceVoice: null,
  editVideo: null,
  editReferenceImage: null,
  submission: null,
};

function uniqueByUrl(items: VideoStudioUploadedAsset[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function toPositiveDuration(input: unknown, fallback: number) {
  const value =
    typeof input === 'number'
      ? input
      : typeof input === 'string'
        ? Number.parseInt(input, 10)
        : Number.NaN;
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function pickRatio(input: unknown, fallback: VideoStudioRatio): VideoStudioRatio {
  const candidates: VideoStudioRatio[] = ['16:9', '9:16', '1:1', '4:3', '3:4'];
  return typeof input === 'string' && candidates.includes(input as VideoStudioRatio)
    ? (input as VideoStudioRatio)
    : fallback;
}

function pickResolution(
  input: unknown,
  fallback: VideoStudioResolution
): VideoStudioResolution {
  return input === '720p' || input === '1080p' ? input : fallback;
}

function pickI2VMode(
  input: unknown,
  fallback: VideoStudioI2VMode
): VideoStudioI2VMode {
  const candidates: VideoStudioI2VMode[] = [
    'first-frame',
    'first-last-frame',
    'video-continuation',
  ];
  return typeof input === 'string' &&
    candidates.includes(input as VideoStudioI2VMode)
    ? (input as VideoStudioI2VMode)
    : fallback;
}

function pickMode(input: unknown, fallback: VideoStudioMode): VideoStudioMode {
  const candidates: VideoStudioMode[] = [
    'text-to-video',
    'image-to-video',
    'reference-to-video',
    'video-edit',
  ];
  return typeof input === 'string' && candidates.includes(input as VideoStudioMode)
    ? (input as VideoStudioMode)
    : fallback;
}

function pickAudioSetting(
  input: unknown,
  fallback: VideoStudioAudioSetting
): VideoStudioAudioSetting {
  return input === 'origin' || input === 'auto' ? input : fallback;
}

function parseUploadedAsset(value: unknown): VideoStudioUploadedAsset | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.url !== 'string' ||
    typeof item.name !== 'string' ||
    typeof item.mimeType !== 'string' ||
    !['image', 'video', 'audio'].includes(String(item.mediaType))
  ) {
    return null;
  }
  return {
    url: item.url,
    name: item.name,
    mimeType: item.mimeType,
    mediaType: item.mediaType as VideoStudioMediaType,
  };
}

function parseUploadedAssetList(value: unknown): VideoStudioUploadedAsset[] {
  if (!Array.isArray(value)) return [];
  return uniqueByUrl(
    value
      .map((item) => parseUploadedAsset(item))
      .filter((item): item is VideoStudioUploadedAsset => Boolean(item))
  );
}

export function mergeStudioDraft(
  current: VideoStudioDraft,
  next: Partial<VideoStudioDraft>
): VideoStudioDraft {
  const hasKey = (key: keyof VideoStudioDraft) =>
    Object.prototype.hasOwnProperty.call(next, key);

  return {
    ...current,
    ...next,
    mode: pickMode(next.mode, current.mode),
    ratio: pickRatio(next.ratio, current.ratio),
    resolution: pickResolution(next.resolution, current.resolution),
    i2vMode: pickI2VMode(next.i2vMode, current.i2vMode),
    audioSetting: pickAudioSetting(next.audioSetting, current.audioSetting),
    duration: toPositiveDuration(next.duration, current.duration),
    textAudio: hasKey('textAudio')
      ? parseUploadedAsset(next.textAudio)
      : current.textAudio,
    imageAudio: hasKey('imageAudio')
      ? parseUploadedAsset(next.imageAudio)
      : current.imageAudio,
    imageFirstFrame: hasKey('imageFirstFrame')
      ? parseUploadedAsset(next.imageFirstFrame)
      : current.imageFirstFrame,
    imageLastFrame: hasKey('imageLastFrame')
      ? parseUploadedAsset(next.imageLastFrame)
      : current.imageLastFrame,
    imageFirstClip: hasKey('imageFirstClip')
      ? parseUploadedAsset(next.imageFirstClip)
      : current.imageFirstClip,
    referenceMaterials: hasKey('referenceMaterials')
      ? parseUploadedAssetList(next.referenceMaterials)
      : current.referenceMaterials,
    referenceFirstFrame: hasKey('referenceFirstFrame')
      ? parseUploadedAsset(next.referenceFirstFrame)
      : current.referenceFirstFrame,
    referenceVoice: hasKey('referenceVoice')
      ? parseUploadedAsset(next.referenceVoice)
      : current.referenceVoice,
    editVideo: hasKey('editVideo')
      ? parseUploadedAsset(next.editVideo)
      : current.editVideo,
    editReferenceImage: hasKey('editReferenceImage')
      ? parseUploadedAsset(next.editReferenceImage)
      : current.editReferenceImage,
    submission: hasKey('submission')
      ? next.submission && typeof next.submission === 'object'
        ? {
            taskId:
              typeof (next.submission as VideoStudioSubmissionDraft).taskId === 'string'
                ? (next.submission as VideoStudioSubmissionDraft).taskId
                : null,
            lifecycle: (next.submission as VideoStudioSubmissionDraft).lifecycle,
            errorMessage:
              (next.submission as VideoStudioSubmissionDraft).errorMessage ?? null,
          }
        : null
      : current.submission,
  };
}

export function parseStudioDraftPayload(payload: unknown): VideoStudioDraft | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;
  if (data.version !== 1 || typeof data.id !== 'string') {
    return null;
  }

  return {
    ...VIDEO_STUDIO_DEFAULT_DRAFT,
    id: data.id,
    source: data.source === 'hero' ? 'hero' : 'studio',
    mode: pickMode(data.mode, VIDEO_STUDIO_DEFAULT_DRAFT.mode),
    prompt: typeof data.prompt === 'string' ? data.prompt : '',
    ratio: pickRatio(data.ratio, VIDEO_STUDIO_DEFAULT_DRAFT.ratio),
    resolution: pickResolution(
      data.resolution,
      VIDEO_STUDIO_DEFAULT_DRAFT.resolution
    ),
    duration: toPositiveDuration(data.duration, VIDEO_STUDIO_DEFAULT_DRAFT.duration),
    i2vMode: pickI2VMode(data.i2vMode, VIDEO_STUDIO_DEFAULT_DRAFT.i2vMode),
    audioSetting: pickAudioSetting(
      data.audioSetting,
      VIDEO_STUDIO_DEFAULT_DRAFT.audioSetting
    ),
    textAudio: parseUploadedAsset(data.textAudio),
    imageAudio: parseUploadedAsset(data.imageAudio),
    imageFirstFrame: parseUploadedAsset(data.imageFirstFrame),
    imageLastFrame: parseUploadedAsset(data.imageLastFrame),
    imageFirstClip: parseUploadedAsset(data.imageFirstClip),
    referenceMaterials: parseUploadedAssetList(data.referenceMaterials),
    referenceFirstFrame: parseUploadedAsset(data.referenceFirstFrame),
    referenceVoice: parseUploadedAsset(data.referenceVoice),
    editVideo: parseUploadedAsset(data.editVideo),
    editReferenceImage: parseUploadedAsset(data.editReferenceImage),
    submission:
      data.submission && typeof data.submission === 'object'
        ? {
            taskId:
              typeof (data.submission as Record<string, unknown>).taskId === 'string'
                ? ((data.submission as Record<string, unknown>).taskId as string)
                : null,
            lifecycle:
              (data.submission as Record<string, unknown>).lifecycle === 'queued' ||
              (data.submission as Record<string, unknown>).lifecycle === 'processing' ||
              (data.submission as Record<string, unknown>).lifecycle === 'completed' ||
              (data.submission as Record<string, unknown>).lifecycle === 'failed' ||
              (data.submission as Record<string, unknown>).lifecycle === 'submitting'
                ? ((data.submission as Record<string, unknown>)
                    .lifecycle as VideoStudioSubmissionLifecycle)
                : 'idle',
            errorMessage:
              typeof (data.submission as Record<string, unknown>).errorMessage ===
              'string'
                ? ((data.submission as Record<string, unknown>).errorMessage as string)
                : null,
          }
        : null,
  };
}

export function buildStudioQueryFromDraft(
  draft: VideoStudioDraft,
  options?: { includePrompt?: boolean }
) {
  const params = new URLSearchParams();
  params.set('studioTab', 'create');
  params.set('from', 'hero');
  params.set('draftId', draft.id);
  params.set('mode', draft.mode);
  if (draft.mode !== 'image-to-video') {
    params.set('ratio', draft.ratio);
  }
  params.set('resolution', draft.resolution);
  params.set('duration', String(draft.duration));
  params.set('i2vMode', draft.i2vMode);
  params.set('audioSetting', draft.audioSetting);
  if (options?.includePrompt !== false && draft.prompt.trim()) {
    params.set('prompt', draft.prompt.trim());
  }
  return params;
}

function pickReferenceMaterialByType(
  items: VideoStudioUploadedAsset[],
  mediaType: VideoStudioMediaType
) {
  return items.filter((item) => item.mediaType === mediaType).map((item) => item.url);
}

export function buildVideoTaskPayloadFromDraft(
  draft: VideoStudioDraft
): VideoStudioGeneratePayload {
  const prompt = draft.prompt.trim();
  if (!prompt) {
    throw new VideoStudioDraftError('PROMPT_REQUIRED');
  }

  if (draft.mode === 'text-to-video') {
    const options: Record<string, unknown> = {
      aspect_ratio: draft.ratio,
      resolution: draft.resolution,
      duration: draft.duration,
    };
    if (draft.textAudio?.url) {
      options.audio_url = draft.textAudio.url;
    }
    return {
      mediaType: AIMediaType.VIDEO,
      scene: 'text-to-video',
      provider: VIDEO_STUDIO_PROVIDER,
      model: VIDEO_STUDIO_MODELS['text-to-video'],
      prompt,
      options,
    };
  }

  if (draft.mode === 'image-to-video') {
    const baseOptions: Record<string, unknown> = {
      resolution: draft.resolution,
      duration: draft.duration,
    };

    if (draft.i2vMode === 'first-frame') {
      if (!draft.imageFirstFrame?.url) {
        throw new VideoStudioDraftError('IMAGE_FIRST_FRAME_REQUIRED');
      }
      baseOptions.first_frame_url = draft.imageFirstFrame.url;
    } else if (draft.i2vMode === 'first-last-frame') {
      if (!draft.imageFirstFrame?.url || !draft.imageLastFrame?.url) {
        throw new VideoStudioDraftError('IMAGE_FIRST_LAST_FRAME_REQUIRED');
      }
      baseOptions.first_frame_url = draft.imageFirstFrame.url;
      baseOptions.last_frame_url = draft.imageLastFrame.url;
    } else {
      if (!draft.imageFirstClip?.url) {
        throw new VideoStudioDraftError('IMAGE_FIRST_CLIP_REQUIRED');
      }
      baseOptions.first_clip_url = draft.imageFirstClip.url;
    }

    if (draft.imageAudio?.url) {
      baseOptions.driving_audio_url = draft.imageAudio.url;
    }

    return {
      mediaType: AIMediaType.VIDEO,
      scene: draft.i2vMode === 'video-continuation' ? 'video-to-video' : 'image-to-video',
      provider: VIDEO_STUDIO_PROVIDER,
      model: VIDEO_STUDIO_MODELS['image-to-video'],
      prompt,
      options: baseOptions,
    };
  }

  if (draft.mode === 'reference-to-video') {
    const referenceImages = pickReferenceMaterialByType(
      draft.referenceMaterials,
      'image'
    );
    const referenceVideos = pickReferenceMaterialByType(
      draft.referenceMaterials,
      'video'
    );

    if (referenceImages.length === 0 && referenceVideos.length === 0) {
      throw new VideoStudioDraftError('REFERENCE_MATERIAL_REQUIRED');
    }

    const options: Record<string, unknown> = {
      aspect_ratio: draft.ratio,
      resolution: draft.resolution,
      duration: draft.duration,
    };
    if (referenceImages.length > 0) {
      options.reference_image = referenceImages.slice(0, 5);
    }
    if (referenceVideos.length > 0) {
      options.reference_video = referenceVideos.slice(0, 5);
    }
    if (draft.referenceFirstFrame?.url) {
      options.first_frame = draft.referenceFirstFrame.url;
    }
    if (draft.referenceVoice?.url) {
      options.reference_voice = draft.referenceVoice.url;
    }

    return {
      mediaType: AIMediaType.VIDEO,
      scene: referenceVideos.length > 0 ? 'video-to-video' : 'image-to-video',
      provider: VIDEO_STUDIO_PROVIDER,
      model: VIDEO_STUDIO_MODELS['reference-to-video'],
      prompt,
      options,
    };
  }

  if (!draft.editVideo?.url) {
    throw new VideoStudioDraftError('EDIT_VIDEO_REQUIRED');
  }

  const options: Record<string, unknown> = {
    video_url: draft.editVideo.url,
    aspect_ratio: draft.ratio,
    resolution: draft.resolution,
    duration: draft.duration,
    audio_setting: draft.audioSetting,
  };
  if (draft.editReferenceImage?.url) {
    options.reference_image = draft.editReferenceImage.url;
  }

  return {
    mediaType: AIMediaType.VIDEO,
    scene: 'video-to-video',
    provider: VIDEO_STUDIO_PROVIDER,
    model: VIDEO_STUDIO_MODELS['video-edit'],
    prompt,
    options,
  };
}
