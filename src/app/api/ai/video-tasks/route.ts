import { AIMediaType } from '@/extensions/ai';
import { respData, respErr } from '@/shared/lib/resp';
import { getAITasks, getAITasksCount } from '@/shared/models/ai_task';
import {
  claimGuestVideoTasksForUser,
  getGuestTrialTokenFromRequest,
  getGuestVideoTasksByToken,
} from '@/shared/models/guest_trial';
import { getUserInfo } from '@/shared/models/user';

type RawTask = Awaited<ReturnType<typeof getAITasks>>[number];

function parseJson(input: string | null) {
  if (!input) return null;
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function extractVideoUrls(result: unknown): string[] {
  if (!result || typeof result !== 'object') {
    return [];
  }

  const data = result as Record<string, unknown>;
  const fromArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const source = item as Record<string, unknown>;
          const candidate =
            source.url ??
            source.uri ??
            source.video ??
            source.src ??
            source.videoUrl;
          return typeof candidate === 'string' ? candidate : null;
        }
        return null;
      })
      .filter((item): item is string => Boolean(item));
  };

  const videos = data.videos;
  const videoList = fromArray(videos);
  if (videoList.length > 0) {
    return videoList;
  }

  const output = data.output ?? data.video ?? data.data;
  if (typeof output === 'string') {
    return [output];
  }

  const outputList = fromArray(output);
  if (outputList.length > 0) {
    return outputList;
  }

  if (typeof data.resultJson === 'string') {
    const parsedResultJson = parseJson(data.resultJson);
    if (parsedResultJson) {
      const resultUrls = fromArray(
        (parsedResultJson as Record<string, unknown>).resultUrls
      );
      if (resultUrls.length > 0) {
        return resultUrls;
      }
    }
  }

  return [];
}

function normalizeTask(task: RawTask) {
  const taskInfo = parseJson(task.taskInfo);
  const taskResult = parseJson(task.taskResult);
  const options = parseJson(task.options);
  const previewUrl =
    extractVideoUrls(taskInfo)[0] ?? extractVideoUrls(taskResult)[0] ?? null;

  const errorMessage =
    (taskInfo &&
      typeof taskInfo === 'object' &&
      typeof (taskInfo as Record<string, unknown>).errorMessage === 'string' &&
      (taskInfo as Record<string, unknown>).errorMessage) ||
    null;

  return {
    id: task.id,
    status: task.status,
    prompt: task.prompt,
    provider: task.provider,
    model: task.model,
    scene: task.scene,
    options,
    previewUrl,
    errorMessage,
    createdAt:
      task.createdAt instanceof Date
        ? task.createdAt.toISOString()
        : task.createdAt,
    updatedAt:
      task.updatedAt instanceof Date
        ? task.updatedAt.toISOString()
        : task.updatedAt,
  };
}

function parsePositiveInteger(input: string | null, fallback: number) {
  const parsed = Number.parseInt(input ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parsePositiveInteger(searchParams.get('page'), 1);
    const limit = Math.min(
      parsePositiveInteger(searchParams.get('limit'), 12),
      30
    );

    const user = await getUserInfo();
    const guestToken = getGuestTrialTokenFromRequest(request);
    let total = 0;
    let safePage = 1;
    let items: RawTask[] = [];

    if (user) {
      if (guestToken) {
        await claimGuestVideoTasksForUser({
          token: guestToken,
          userId: user.id,
        });
      }

      total = await getAITasksCount({
        userId: user.id,
        mediaType: AIMediaType.VIDEO,
      });
      const totalPages = Math.max(1, Math.ceil(total / limit));
      safePage = Math.min(page, totalPages);
      items = await getAITasks({
        userId: user.id,
        mediaType: AIMediaType.VIDEO,
        page: safePage,
        limit,
      });
    } else {
      if (!guestToken) {
        return respData({
          items: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 1,
          },
        });
      }

      let guestResult = await getGuestVideoTasksByToken({
        token: guestToken,
        page,
        limit,
      });
      total = guestResult.total;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      safePage = Math.min(page, totalPages);
      if (safePage !== page) {
        guestResult = await getGuestVideoTasksByToken({
          token: guestToken,
          page: safePage,
          limit,
        });
      }
      items = guestResult.items;
    }

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return respData({
      items: items.map((item) => normalizeTask(item)),
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error('list video tasks failed:', error);
    return respErr(error?.message || 'failed to list video tasks');
  }
}
