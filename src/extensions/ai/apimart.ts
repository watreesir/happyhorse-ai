import { getUuid } from '@/shared/lib/hash';

import { saveFiles } from '.';
import {
  AIConfigs,
  AIFile,
  AIGenerateParams,
  AIMediaType,
  AIProvider,
  AITaskResult,
  AITaskStatus,
  AIVideo,
} from './types';

export interface APIMartConfigs extends AIConfigs {
  apiKey: string;
  baseUrl?: string;
  customStorage?: boolean;
}

type APIMartErrorBody = {
  error?: {
    code?: number | string;
    message?: string;
    type?: string;
  };
  message?: string;
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function pickString(value: unknown) {
  return typeof value === 'string' && value ? value : null;
}

function pickStringList(value: unknown) {
  if (typeof value === 'string' && value) return [value];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === 'string' && Boolean(item)
  );
}

function pickSeed(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed)) return parsed;
  }
  return null;
}

function toAPIMartResolution(value: unknown) {
  return value === '720p' || value === '720P' ? '720P' : '1080P';
}

function toDateFromSeconds(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return new Date();
  }
  return new Date(value * 1000);
}

async function readError(resp: Response, fallback: string) {
  try {
    const body = (await resp.json()) as APIMartErrorBody;
    return body.error?.message || body.message || fallback;
  } catch {
    return fallback;
  }
}

export class APIMartProvider implements AIProvider {
  readonly name = 'apimart';
  configs: APIMartConfigs;
  private baseUrl: string;

  constructor(configs: APIMartConfigs) {
    this.configs = configs;
    this.baseUrl = trimTrailingSlash(
      configs.baseUrl || 'https://api.apimart.ai/v1'
    );
  }

  private headers() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.configs.apiKey}`,
    };
  }

  async generateVideo({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    if (!params.model) {
      throw new Error('model is required');
    }
    if (!params.prompt?.trim()) {
      throw new Error('prompt is required');
    }

    const options = params.options || {};
    const videoUrl = pickString(options.video_url);
    const firstFrameImage =
      pickString(options.first_frame_image) ||
      pickString(options.first_frame_url);
    const imageUrls =
      pickStringList(options.image_urls).length > 0
        ? pickStringList(options.image_urls)
        : pickStringList(options.reference_image);
    const seed = pickSeed(options.seed);

    const payload: Record<string, unknown> = {
      model: params.model,
      prompt: params.prompt,
      resolution: toAPIMartResolution(options.resolution),
    };

    if (videoUrl) {
      payload.video_url = videoUrl;
      if (imageUrls.length > 0) {
        payload.image_urls = imageUrls.slice(0, 5);
      }
      if (
        options.audio_setting === 'origin' ||
        options.audio_setting === 'auto'
      ) {
        payload.audio_setting = options.audio_setting;
      }
    } else if (firstFrameImage) {
      payload.first_frame_image = firstFrameImage;
      if (options.duration) {
        payload.duration = options.duration;
      }
    } else if (imageUrls.length > 0) {
      payload.image_urls = imageUrls.slice(0, 9);
      if (options.aspect_ratio) {
        payload.size = options.aspect_ratio;
      }
      if (options.duration) {
        payload.duration = options.duration;
      }
    } else {
      if (options.aspect_ratio) {
        payload.size = options.aspect_ratio;
      }
      if (options.duration) {
        payload.duration = options.duration;
      }
    }

    if (seed !== null) {
      payload.seed = seed;
    }

    const resp = await fetch(`${this.baseUrl}/videos/generations`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      throw new Error(
        await readError(resp, `request failed with status: ${resp.status}`)
      );
    }

    const result = await resp.json();
    if (result.code !== 200) {
      throw new Error(
        result.error?.message || result.message || 'generate video failed'
      );
    }

    const task = Array.isArray(result.data) ? result.data[0] : null;
    if (!task?.task_id) {
      throw new Error('generate video failed: no task_id');
    }

    return {
      taskStatus: AITaskStatus.PENDING,
      taskId: task.task_id,
      taskInfo: {
        status: task.status,
      },
      taskResult: result,
    };
  }

  async generate({
    params,
  }: {
    params: AIGenerateParams;
  }): Promise<AITaskResult> {
    if (params.mediaType !== AIMediaType.VIDEO) {
      throw new Error(`mediaType not supported: ${params.mediaType}`);
    }
    return this.generateVideo({ params });
  }

  async queryVideo({ taskId }: { taskId: string }): Promise<AITaskResult> {
    const resp = await fetch(
      `${this.baseUrl}/tasks/${encodeURIComponent(taskId)}?language=zh`,
      {
        method: 'GET',
        headers: this.headers(),
      }
    );

    if (!resp.ok) {
      throw new Error(
        await readError(resp, `request failed with status: ${resp.status}`)
      );
    }

    const result = await resp.json();
    if (result.code !== 200 || !result.data?.status) {
      throw new Error(
        result.error?.message || result.message || 'query video failed'
      );
    }

    const data = result.data;
    const taskStatus = this.mapStatus(data.status);
    const createTime = toDateFromSeconds(data.created);
    const thumbnailUrl = pickString(data.result?.thumbnail_url) || undefined;
    let videos: AIVideo[] | undefined;

    if (Array.isArray(data.result?.videos)) {
      videos = data.result.videos.flatMap((item: Record<string, unknown>) =>
        pickStringList(item.url).map((url) => ({
          id: '',
          createTime,
          videoUrl: url,
          thumbnailUrl,
        }))
      );
    }

    if (
      taskStatus === AITaskStatus.SUCCESS &&
      videos &&
      videos.length > 0 &&
      this.configs.customStorage
    ) {
      const filesToSave: AIFile[] = [];
      videos.forEach((video, index) => {
        if (!video.videoUrl) return;
        filesToSave.push({
          url: video.videoUrl,
          contentType: 'video/mp4',
          key: `apimart/video/${getUuid()}.mp4`,
          index,
          type: 'video',
        });
      });

      if (filesToSave.length > 0) {
        const uploadedFiles = await saveFiles(filesToSave);
        uploadedFiles?.forEach((file) => {
          if (file.url && file.index !== undefined && videos?.[file.index]) {
            videos[file.index].videoUrl = file.url;
          }
        });
      }
    }

    return {
      taskId,
      taskStatus,
      taskInfo: {
        videos,
        status: data.status,
        errorCode: data.error?.code ? String(data.error.code) : undefined,
        errorMessage: data.error?.message,
        createTime,
      },
      taskResult: result,
    };
  }

  async query({ taskId }: { taskId: string }): Promise<AITaskResult> {
    return this.queryVideo({ taskId });
  }

  private mapStatus(status: string): AITaskStatus {
    switch (status) {
      case 'pending':
      case 'submitted':
        return AITaskStatus.PENDING;
      case 'processing':
        return AITaskStatus.PROCESSING;
      case 'completed':
        return AITaskStatus.SUCCESS;
      case 'cancelled':
        return AITaskStatus.CANCELED;
      case 'failed':
        return AITaskStatus.FAILED;
      default:
        throw new Error(`unknown status: ${status}`);
    }
  }
}
