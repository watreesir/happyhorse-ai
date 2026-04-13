import { respData, respErr } from '@/shared/lib/resp';
import { deleteOwnedStorageFileByUrl } from '@/shared/services/storage';
import {
  canGuestAccessTask,
  getGuestTrialTokenFromRequest,
} from '@/shared/models/guest_trial';
import {
  findAITaskById,
  softDeleteAITaskById,
} from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';

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
  const urls = new Set<string>();

  const collectArray = (value: unknown) => {
    if (!Array.isArray(value)) return;

    for (const item of value) {
      if (typeof item === 'string') {
        urls.add(item);
        continue;
      }

      if (!item || typeof item !== 'object') continue;
      const source = item as Record<string, unknown>;
      const candidate =
        source.videoUrl ??
        source.url ??
        source.uri ??
        source.video ??
        source.src;

      if (typeof candidate === 'string') {
        urls.add(candidate);
      }
    }
  };

  collectArray(data.videos);
  collectArray(data.output);
  collectArray(data.data);

  if (typeof data.video === 'string') {
    urls.add(data.video);
  }

  if (typeof data.output === 'string') {
    urls.add(data.output);
  }

  if (typeof data.resultJson === 'string') {
    const parsedResultJson = parseJson(data.resultJson);
    if (parsedResultJson && typeof parsedResultJson === 'object') {
      collectArray((parsedResultJson as Record<string, unknown>).resultUrls);
    }
  }

  return [...urls];
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = id?.trim();

    if (!taskId) {
      return respErr('task id is required');
    }

    const user = await getUserInfo();
    const guestToken = user ? '' : getGuestTrialTokenFromRequest(request);

    if (!user && !guestToken) {
      return respErr('no auth');
    }

    const task = await findAITaskById(taskId);
    if (!task) {
      return respErr('task not found');
    }

    if (user) {
      if (task.userId !== user.id) {
        return respErr('no permission');
      }
    } else {
      const hasAccess = await canGuestAccessTask({
        token: guestToken,
        taskId,
      });

      if (!hasAccess) {
        return respErr('no permission');
      }
    }

    if (task.deletedAt) {
      return respData({
        id: taskId,
        deleted: true,
      });
    }

    const taskInfo = parseJson(task.taskInfo);
    const taskResult = parseJson(task.taskResult);
    const assetUrls = [
      ...extractVideoUrls(taskInfo),
      ...extractVideoUrls(taskResult),
    ].filter(Boolean);

    if (assetUrls.length > 0) {
      const uniqueAssetUrls = [...new Set(assetUrls)];
      const deleteResults = await Promise.all(
        uniqueAssetUrls.map((url) => deleteOwnedStorageFileByUrl(url))
      );

      const failedOwnedDelete = deleteResults.find(
        (result) => !result.skipped && !result.deleted
      );

      if (failedOwnedDelete) {
        return respErr('failed to delete task asset');
      }
    }

    await softDeleteAITaskById(taskId);

    return respData({
      id: taskId,
      deleted: true,
    });
  } catch (error: any) {
    console.error('delete video task failed:', error);
    return respErr(error?.message || 'failed to delete video task');
  }
}
