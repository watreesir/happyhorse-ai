import { AIMediaType } from '@/extensions/ai';
import { respData, respErr } from '@/shared/lib/resp';
import { getAITasks, getAITasksCount } from '@/shared/models/ai_task';
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
  const videos = data.videos;
  if (Array.isArray(videos)) {
    return videos
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const candidate = (item as Record<string, unknown>).url;
          return typeof candidate === 'string' ? candidate : null;
        }
        return null;
      })
      .filter((item): item is string => Boolean(item));
  }

  const output = data.output ?? data.video ?? data.data;
  if (typeof output === 'string') {
    return [output];
  }
  if (Array.isArray(output)) {
    return output
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const candidate =
            (item as Record<string, unknown>).url ??
            (item as Record<string, unknown>).videoUrl;
          return typeof candidate === 'string' ? candidate : null;
        }
        return null;
      })
      .filter((item): item is string => Boolean(item));
  }

  return [];
}

function normalizeTask(task: RawTask) {
  const taskInfo = parseJson(task.taskInfo);
  const taskResult = parseJson(task.taskResult);
  const options = parseJson(task.options);
  const previewUrl =
    extractVideoUrls(taskInfo)[0] ??
    extractVideoUrls(taskResult)[0] ??
    null;

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
      task.createdAt instanceof Date ? task.createdAt.toISOString() : task.createdAt,
    updatedAt:
      task.updatedAt instanceof Date ? task.updatedAt.toISOString() : task.updatedAt,
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
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInteger(searchParams.get('page'), 1);
    const limit = Math.min(parsePositiveInteger(searchParams.get('limit'), 12), 30);

    const total = await getAITasksCount({
      userId: user.id,
      mediaType: AIMediaType.VIDEO,
    });
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const items = await getAITasks({
      userId: user.id,
      mediaType: AIMediaType.VIDEO,
      page: safePage,
      limit,
    });

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
