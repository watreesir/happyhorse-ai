import { AITaskStatus } from '@/extensions/ai/types';
import { VideoStudioGeneratePayload } from '@/shared/lib/video-studio-workflow';

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
    throw new Error(payload.message || fallbackMessage);
  }
  return payload.data;
}

function resolvePreviewUrl(taskInfo: unknown, taskResult: unknown) {
  return extractVideoUrls(taskInfo)[0] ?? extractVideoUrls(taskResult)[0] ?? null;
}

function parseDate(input: string | number | Date) {
  const value = input instanceof Date ? input.getTime() : new Date(input).getTime();
  return Number.isFinite(value) ? value : Date.now();
}

export function mapTaskStatus(status: string): VideoStatus {
  if (status === AITaskStatus.SUCCESS) return 'ready';
  if (status === AITaskStatus.PROCESSING) return 'rendering';
  if (status === AITaskStatus.PENDING) return 'queued';
  return 'failed';
}

function resolvePalette(seed: number): VideoPalette {
  const palettes: VideoPalette[] = ['teal', 'copper', 'ink', 'amber', 'slate', 'crimson'];
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
  const duration = task.options?.duration;
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

export function mapTaskToDraft(task: VideoTaskRecord, index: number): VideoDraft {
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
  };
}

export async function listVideoTasks({
  page,
  limit,
}: {
  page: number;
  limit: number;
}): Promise<VideoTaskPageData> {
  const response = await fetch(`/api/ai/video-tasks?page=${page}&limit=${limit}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`request failed with status: ${response.status}`);
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
    throw new Error(`request failed with status: ${response.status}`);
  }

  const responsePayload = (await response.json()) as ApiResponse<GenerateTaskPayload>;
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
      (taskInfo && typeof taskInfo.errorMessage === 'string' && taskInfo.errorMessage) ||
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
    throw new Error(`request failed with status: ${response.status}`);
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
      (taskInfo && typeof taskInfo.errorMessage === 'string' && taskInfo.errorMessage) ||
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
    throw new Error(`request failed with status: ${response.status}`);
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
