import { AITaskStatus } from '@/extensions/ai/types';
import {
  ApiResponseError,
  createApiResponseError,
  readApiErrorMessage,
} from '@/shared/lib/api-client';
import { isPromptModerationErrorCode } from '@/shared/lib/prompt-moderation-messages';
import {
  getVideoStudioModelDisplayName,
  HAPPYHORSE_MODEL,
  HAPPYHORSE_MODEL_KEY,
  isHappyHorseProviderModel,
  WAN_27_MODEL_KEY,
} from '@/shared/lib/video-models';
import {
  VIDEO_STUDIO_DEFAULT_DRAFT,
  VIDEO_STUDIO_MODELS,
  VideoStudioDraft,
  VideoStudioGeneratePayload,
  VideoStudioI2VMode,
  VideoStudioMediaType,
  VideoStudioMode,
  VideoStudioUploadedAsset,
} from '@/shared/lib/video-studio-workflow';

import {
  StudioTaskLifecycle,
  VideoDraft,
  VideoPalette,
  VideoStatus,
  VideoTaskPageData,
  VideoTaskRecord,
} from './types';

const POLL_INTERVAL_MS = 8_000;

type ApiResponse<T> = {
  code: number;
  message?: string;
  data?: T;
};

type QueryTaskPayload = {
  id: string;
  status: string;
  provider: string;
  model: string;
  prompt: string | null;
  scene: string | null;
  options: string | null;
  taskInfo: string | null;
  taskResult: string | null;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
};

type GenerateTaskPayload = {
  id: string;
  status: string;
  provider: string;
  model: string;
  prompt: string;
  scene: string;
  options: string | null;
  taskInfo: string | null;
  taskResult: string | null;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
};

function isObject(input: unknown): input is Record<string, unknown> {
  return Boolean(input) && typeof input === 'object' && !Array.isArray(input);
}

function parseJson(input: string | null): Record<string, unknown> | null {
  if (!input) return null;
  try {
    const parsed = JSON.parse(input);
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function extractVideoUrls(result: unknown): string[] {
  if (!isObject(result)) {
    return [];
  }

  const extractFromArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (isObject(item)) {
          const candidate =
            item.url ?? item.uri ?? item.video ?? item.src ?? item.videoUrl;
          return typeof candidate === 'string' ? candidate : null;
        }
        return null;
      })
      .filter((item): item is string => Boolean(item));
  };

  const videos = result.videos;
  const fromVideos = extractFromArray(videos);
  if (fromVideos.length > 0) {
    return fromVideos;
  }

  const output = result.output ?? result.video ?? result.data;
  if (typeof output === 'string') {
    return [output];
  }
  const fromOutput = extractFromArray(output);
  if (fromOutput.length > 0) {
    return fromOutput;
  }

  if (typeof result.resultJson === 'string') {
    try {
      const parsedResultJson = JSON.parse(result.resultJson);
      if (isObject(parsedResultJson)) {
        const fromResultJson = extractFromArray(parsedResultJson.resultUrls);
        if (fromResultJson.length > 0) {
          return fromResultJson;
        }
      }
    } catch {
      // ignore malformed resultJson
    }
  }

  return [];
}

function ensureSuccess<T>(payload: ApiResponse<T>, fallbackMessage: string): T {
  if (payload.code !== 0 || typeof payload.data === 'undefined') {
    const errorCode =
      isObject(payload.data) && typeof payload.data.errorCode === 'string'
        ? payload.data.errorCode
        : undefined;
    if (isPromptModerationErrorCode(errorCode)) {
      throw new ApiResponseError({
        message: payload.message || fallbackMessage,
        status: 200,
        code: payload.code,
        data: payload.data,
        errorCode,
      });
    }
    throw new Error(payload.message || fallbackMessage);
  }
  return payload.data;
}

function resolvePreviewUrl(taskInfo: unknown, taskResult: unknown) {
  return (
    extractVideoUrls(taskInfo)[0] ?? extractVideoUrls(taskResult)[0] ?? null
  );
}

function parseDate(input: string | number | Date) {
  const value =
    input instanceof Date ? input.getTime() : new Date(input).getTime();
  return Number.isFinite(value) ? value : Date.now();
}

function pickString(value: unknown): string | null {
  if (typeof value === 'string' && value) {
    return value;
  }
  if (isObject(value)) {
    const candidate =
      value.url ?? value.uri ?? value.src ?? value.fileUrl ?? value.mediaUrl;
    return typeof candidate === 'string' && candidate ? candidate : null;
  }
  return null;
}

function pickStringList(value: unknown): string[] {
  if (typeof value === 'string' && value) {
    return [value];
  }
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => pickString(item))
    .filter((item): item is string => Boolean(item));
}

function pickNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

function inferMimeType(url: string, mediaType: VideoStudioMediaType) {
  const cleanUrl = url.split('?')[0]?.split('#')[0] ?? url;
  const extension = cleanUrl.split('.').pop()?.toLowerCase();

  if (extension) {
    if (['jpg', 'jpeg'].includes(extension)) return 'image/jpeg';
    if (extension === 'png') return 'image/png';
    if (extension === 'webp') return 'image/webp';
    if (extension === 'gif') return 'image/gif';
    if (extension === 'avif') return 'image/avif';
    if (extension === 'mp4' || extension === 'm4v') return 'video/mp4';
    if (extension === 'webm') return 'video/webm';
    if (extension === 'mov') return 'video/quicktime';
    if (extension === 'avi') return 'video/x-msvideo';
    if (extension === 'mkv') return 'video/x-matroska';
    if (extension === 'mp3') return 'audio/mpeg';
    if (extension === 'wav') return 'audio/wav';
    if (extension === 'm4a') return 'audio/mp4';
    if (extension === 'ogg') return 'audio/ogg';
  }

  if (mediaType === 'image') return 'image/jpeg';
  if (mediaType === 'video') return 'video/mp4';
  return 'audio/mpeg';
}

function inferFileName(
  url: string,
  mediaType: VideoStudioMediaType,
  fallbackBase: string
) {
  const cleanUrl = url.split('?')[0]?.split('#')[0] ?? url;
  const rawName = cleanUrl.split('/').pop();
  if (rawName) {
    try {
      return decodeURIComponent(rawName);
    } catch {
      return rawName;
    }
  }

  if (mediaType === 'image') return `${fallbackBase}.jpg`;
  if (mediaType === 'video') return `${fallbackBase}.mp4`;
  return `${fallbackBase}.mp3`;
}

export function createUploadedAssetFromUrl(
  url: string,
  mediaType: VideoStudioMediaType,
  fallbackBase: string,
  durationSeconds?: number
): VideoStudioUploadedAsset {
  return {
    url,
    name: inferFileName(url, mediaType, fallbackBase),
    mimeType: inferMimeType(url, mediaType),
    mediaType,
    durationSeconds,
  };
}

function resolveMode(task: {
  model?: string;
  scene?: string;
  options?: Record<string, unknown> | null;
}): VideoStudioMode {
  if (task.model === HAPPYHORSE_MODEL) {
    if (pickString(task.options?.video_url)) {
      return 'video-edit';
    }
    if (
      pickString(task.options?.first_frame_url) ||
      pickString(task.options?.first_frame_image)
    ) {
      return 'image-to-video';
    }
    if (pickStringList(task.options?.image_urls).length > 0) {
      return 'reference-to-video';
    }
    return 'text-to-video';
  }

  if (task.model === VIDEO_STUDIO_MODELS['text-to-video']) {
    return 'text-to-video';
  }
  if (task.model === VIDEO_STUDIO_MODELS['image-to-video']) {
    return 'image-to-video';
  }
  if (task.model === VIDEO_STUDIO_MODELS['reference-to-video']) {
    return 'reference-to-video';
  }
  if (task.model === VIDEO_STUDIO_MODELS['video-edit']) {
    return 'video-edit';
  }

  if (pickString(task.options?.video_url)) {
    return 'video-edit';
  }
  if (
    pickString(task.options?.first_frame_url) ||
    pickString(task.options?.first_frame_image) ||
    pickString(task.options?.last_frame_url) ||
    pickString(task.options?.first_clip_url)
  ) {
    return 'image-to-video';
  }
  if (
    pickStringList(task.options?.reference_image).length > 0 ||
    pickStringList(task.options?.image_urls).length > 0 ||
    pickStringList(task.options?.reference_video).length > 0 ||
    pickString(task.options?.first_frame) ||
    pickString(task.options?.reference_voice)
  ) {
    return 'reference-to-video';
  }
  if (
    task.scene === 'video-to-video' &&
    pickString(task.options?.reference_image)
  ) {
    return 'video-edit';
  }
  return 'text-to-video';
}

function resolveI2VMode(
  options: Record<string, unknown> | null
): VideoStudioI2VMode {
  if (pickString(options?.first_clip_url)) {
    return 'video-continuation';
  }
  if (pickString(options?.last_frame_url)) {
    return 'first-last-frame';
  }
  return 'first-frame';
}

function resolveRatioOption(options: Record<string, unknown> | null) {
  const ratio = options?.aspect_ratio;
  if (
    ratio === '16:9' ||
    ratio === '9:16' ||
    ratio === '1:1' ||
    ratio === '4:3' ||
    ratio === '3:4'
  ) {
    return ratio;
  }
  return VIDEO_STUDIO_DEFAULT_DRAFT.ratio;
}

function resolveResolutionOption(options: Record<string, unknown> | null) {
  const resolution = options?.resolution;
  if (resolution === '720p' || resolution === '720P') return '720p';
  if (resolution === '1080p' || resolution === '1080P') return '1080p';
  return VIDEO_STUDIO_DEFAULT_DRAFT.resolution;
}

function resolveDurationOption(options: Record<string, unknown> | null) {
  const duration = options?.duration;
  if (
    typeof duration === 'number' &&
    Number.isFinite(duration) &&
    duration > 0
  ) {
    return duration;
  }
  if (typeof duration === 'string') {
    const parsed = Number.parseInt(duration, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return VIDEO_STUDIO_DEFAULT_DRAFT.duration;
}

function resolveAudioSettingOption(options: Record<string, unknown> | null) {
  return options?.audio_setting === 'origin'
    ? 'origin'
    : VIDEO_STUDIO_DEFAULT_DRAFT.audioSetting;
}

function resolveSeedOption(options: Record<string, unknown> | null) {
  const seed = options?.seed;
  if (typeof seed === 'number' && Number.isInteger(seed)) {
    return String(seed);
  }
  return typeof seed === 'string' ? seed.trim() : '';
}

export function mapTaskStatus(status: string): VideoStatus {
  if (status === AITaskStatus.SUCCESS) return 'ready';
  if (status === AITaskStatus.PROCESSING) return 'rendering';
  if (status === AITaskStatus.PENDING) return 'queued';
  return 'failed';
}

function resolvePalette(seed: number): VideoPalette {
  const palettes: VideoPalette[] = [
    'teal',
    'copper',
    'ink',
    'amber',
    'slate',
    'crimson',
  ];
  return palettes[seed % palettes.length] ?? 'slate';
}

function resolveTitle(prompt: string) {
  const normalized = prompt.replace(/\s+/g, ' ').trim();
  if (!normalized) return 'Untitled Clip';
  const compact = normalized.slice(0, 48).trim();
  return compact.length < normalized.length ? `${compact}...` : compact;
}

function resolveAspectRatio(task: VideoTaskRecord) {
  const optionRatio = task.options?.aspect_ratio;
  if (typeof optionRatio === 'string') {
    return optionRatio.replace(':', ' / ');
  }
  return '16 / 9';
}

function resolveLengthLabel(task: VideoTaskRecord) {
  const duration = task.options?.duration ?? task.options?.source_duration;
  if (typeof duration === 'string' && duration) {
    return `${duration}s`;
  }
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    return `${duration}s`;
  }
  return '5s';
}

function formatRelativeTime(input: string | number | Date) {
  const now = Date.now();
  const target = parseDate(input);
  const diffSeconds = Math.round((target - now) / 1000);
  const absSeconds = Math.abs(diffSeconds);

  if (absSeconds < 60) return 'just now';
  const absMinutes = Math.round(absSeconds / 60);
  if (absMinutes < 60) return `${absMinutes}m ago`;
  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) return `${absHours}h ago`;
  const absDays = Math.round(absHours / 24);
  return `${absDays}d ago`;
}

export function mapTaskToDraft(
  task: VideoTaskRecord,
  index: number
): VideoDraft {
  const prompt = task.prompt ?? '';
  return {
    id: task.id,
    title: resolveTitle(prompt),
    prompt,
    status: mapTaskStatus(task.status),
    previewUrl: task.previewUrl,
    updatedLabel: formatRelativeTime(task.updatedAt),
    lengthLabel: resolveLengthLabel(task),
    aspectRatio: resolveAspectRatio(task),
    palette: resolvePalette(index),
    model: task.model,
    modelLabel: getVideoStudioModelDisplayName({
      provider: task.provider,
      model: task.model,
    }),
    scene: task.scene,
    options: task.options,
  };
}

export function buildRecreateDraftFromTask(
  task: Pick<VideoTaskRecord, 'prompt'> & {
    model?: string;
    scene?: string;
    options?: Record<string, unknown> | null;
  }
): Partial<VideoStudioDraft> {
  const mode = resolveMode(task);
  const options = task.options ?? null;
  const modelKey = isHappyHorseProviderModel(undefined, task.model)
    ? HAPPYHORSE_MODEL_KEY
    : WAN_27_MODEL_KEY;
  const nextDraft: Partial<VideoStudioDraft> = {
    modelKey,
    mode,
    prompt: task.prompt ?? '',
    ratio: resolveRatioOption(options),
    resolution: resolveResolutionOption(options),
    duration: resolveDurationOption(options),
    seed: resolveSeedOption(options),
    i2vMode: resolveI2VMode(options),
    audioSetting: resolveAudioSettingOption(options),
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

  if (modelKey === HAPPYHORSE_MODEL_KEY && mode === 'video-edit') {
    nextDraft.duration = 0;
  }

  if (mode === 'text-to-video') {
    const audioUrl = pickString(options?.audio_url);
    if (audioUrl) {
      nextDraft.textAudio = createUploadedAssetFromUrl(
        audioUrl,
        'audio',
        'audio-track'
      );
    }
    return nextDraft;
  }

  if (mode === 'image-to-video') {
    const firstFrameUrl =
      pickString(options?.first_frame_url) ||
      pickString(options?.first_frame_image);
    const lastFrameUrl = pickString(options?.last_frame_url);
    const firstClipUrl = pickString(options?.first_clip_url);
    const audioUrl = pickString(options?.driving_audio_url);

    if (firstClipUrl) {
      nextDraft.imageFirstClip = createUploadedAssetFromUrl(
        firstClipUrl,
        'video',
        'first-clip'
      );
    } else if (firstFrameUrl) {
      nextDraft.imageFirstFrame = createUploadedAssetFromUrl(
        firstFrameUrl,
        'image',
        'first-frame'
      );
    }

    if (lastFrameUrl) {
      nextDraft.imageLastFrame = createUploadedAssetFromUrl(
        lastFrameUrl,
        'image',
        'last-frame'
      );
    }

    if (audioUrl) {
      nextDraft.imageAudio = createUploadedAssetFromUrl(
        audioUrl,
        'audio',
        'driving-audio'
      );
    }

    return nextDraft;
  }

  if (mode === 'reference-to-video') {
    const referenceImages = [
      ...pickStringList(options?.reference_image),
      ...pickStringList(options?.image_urls),
    ].map((url, index) =>
      createUploadedAssetFromUrl(url, 'image', `reference-image-${index + 1}`)
    );
    const referenceVideos = pickStringList(options?.reference_video).map(
      (url, index) =>
        createUploadedAssetFromUrl(url, 'video', `reference-video-${index + 1}`)
    );
    const firstFrame = pickString(options?.first_frame);
    const referenceVoice = pickString(options?.reference_voice);

    nextDraft.referenceMaterials = [
      ...referenceImages,
      ...referenceVideos,
    ].slice(0, 5);

    if (firstFrame) {
      nextDraft.referenceFirstFrame = createUploadedAssetFromUrl(
        firstFrame,
        'image',
        'reference-first-frame'
      );
    }

    if (referenceVoice) {
      nextDraft.referenceVoice = createUploadedAssetFromUrl(
        referenceVoice,
        'audio',
        'reference-voice'
      );
    }

    return nextDraft;
  }

  const editVideoUrl = pickString(options?.video_url);
  const referenceImageUrl =
    pickString(options?.reference_image) ??
    pickStringList(options?.image_urls)[0] ??
    pickStringList(options?.reference_image)[0] ??
    null;
  const sourceDuration = pickNumber(options?.source_duration);

  if (editVideoUrl) {
    nextDraft.editVideo = createUploadedAssetFromUrl(
      editVideoUrl,
      'video',
      'edit-video',
      sourceDuration
    );
  }
  if (referenceImageUrl) {
    nextDraft.editReferenceImage = createUploadedAssetFromUrl(
      referenceImageUrl,
      'image',
      'edit-reference-image'
    );
  }

  return nextDraft;
}

export async function listVideoTasks({
  page,
  limit,
}: {
  page: number;
  limit: number;
}): Promise<VideoTaskPageData> {
  const response = await fetch(
    `/api/ai/video-tasks?page=${page}&limit=${limit}`,
    {
      cache: 'no-store',
    }
  );
  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  const payload = (await response.json()) as ApiResponse<VideoTaskPageData>;
  return ensureSuccess(payload, 'Unable to load video tasks');
}

export async function generateVideoTask(
  payload: VideoStudioGeneratePayload
): Promise<VideoTaskRecord> {
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

  const responsePayload =
    (await response.json()) as ApiResponse<GenerateTaskPayload>;
  const data = ensureSuccess(responsePayload, 'Unable to create video task');

  const taskInfo = parseJson(data.taskInfo);
  const taskResult = parseJson(data.taskResult);

  return {
    id: data.id,
    status: data.status,
    prompt: data.prompt ?? payload.prompt,
    provider: data.provider,
    model: data.model,
    scene: data.scene,
    options: parseJson(data.options),
    previewUrl: resolvePreviewUrl(taskInfo, taskResult),
    errorMessage:
      (taskInfo &&
        typeof taskInfo.errorMessage === 'string' &&
        taskInfo.errorMessage) ||
      null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function queryVideoTask(taskId: string): Promise<VideoTaskRecord> {
  const response = await fetch('/api/ai/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ taskId }),
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  const payload = (await response.json()) as ApiResponse<QueryTaskPayload>;
  const data = ensureSuccess(payload, 'Unable to query task status');

  const taskInfo = parseJson(data.taskInfo);
  const taskResult = parseJson(data.taskResult);

  return {
    id: data.id,
    status: data.status,
    prompt: data.prompt ?? '',
    provider: data.provider,
    model: data.model,
    scene: data.scene ?? '',
    options: parseJson(data.options),
    previewUrl: resolvePreviewUrl(taskInfo, taskResult),
    errorMessage:
      (taskInfo &&
        typeof taskInfo.errorMessage === 'string' &&
        taskInfo.errorMessage) ||
      null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function deleteVideoTask(taskId: string) {
  const response = await fetch(`/api/ai/video-tasks/${taskId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response));
  }

  const payload = (await response.json()) as ApiResponse<{
    id: string;
    deleted: boolean;
  }>;

  return ensureSuccess(payload, 'Unable to delete video task');
}

export function toLifecycle(status: string): StudioTaskLifecycle {
  if (status === AITaskStatus.PENDING) return 'queued';
  if (status === AITaskStatus.PROCESSING) return 'processing';
  if (status === AITaskStatus.SUCCESS) return 'completed';
  if (status === AITaskStatus.FAILED || status === AITaskStatus.CANCELED) {
    return 'failed';
  }
  return 'idle';
}

export { POLL_INTERVAL_MS };

export async function refreshPendingTasks(
  tasks: VideoTaskRecord[],
  maxCount = 2
) {
  const candidates = tasks
    .filter(
      (task) =>
        task.status === AITaskStatus.PENDING ||
        task.status === AITaskStatus.PROCESSING
    )
    .slice(0, maxCount);

  if (candidates.length === 0) {
    return false;
  }

  await Promise.all(
    candidates.map(async (task) => {
      try {
        await queryVideoTask(task.id);
      } catch {
        // ignore single task query failures during background sync
      }
    })
  );

  return true;
}
