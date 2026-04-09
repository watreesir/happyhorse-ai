import { respData, respErr } from '@/shared/lib/resp';
import {
  findAITaskByProviderTaskId,
  UpdateAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
import { getAIService } from '@/shared/services/ai';
import { sendAITaskCompletionEmailIfNeeded } from '@/shared/services/ai-task-notify';

function extractTaskIdFromPayload(payload: any): string | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const direct =
    payload.taskId || payload.task_id || payload.id || payload.request_id;
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }

  const data = payload.data;
  if (data && typeof data === 'object') {
    const nested =
      data.taskId || data.task_id || data.id || data.request_id;
    if (typeof nested === 'string' && nested.trim()) {
      return nested.trim();
    }
  }

  return null;
}

async function readPayload(req: Request): Promise<any> {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return req.json();
  }

  const text = await req.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    if (!provider) {
      return respErr('provider is required');
    }

    const payload = await readPayload(req);
    const taskIdFromPayload = extractTaskIdFromPayload(payload);

    if (!taskIdFromPayload) {
      return respData({
        accepted: true,
        provider,
        ignored: true,
        reason: 'taskId missing',
      });
    }

    const task = await findAITaskByProviderTaskId({
      providerTaskId: taskIdFromPayload,
      provider,
    });
    if (!task || !task.taskId) {
      return respData({
        accepted: true,
        provider,
        ignored: true,
        reason: 'task not found',
      });
    }

    const aiService = await getAIService();
    const aiProvider = aiService.getProvider(provider);
    if (!aiProvider) {
      return respErr('invalid ai provider');
    }

    const result = await aiProvider.query?.({
      taskId: task.taskId,
      mediaType: task.mediaType,
      model: task.model,
    });

    if (!result?.taskStatus) {
      return respErr('query ai task failed');
    }

    const previousStatus = task.status;
    const updateAITask: UpdateAITask = {
      status: result.taskStatus,
      taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
      taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
      creditId: task.creditId,
    };

    const shouldPersist =
      updateAITask.status !== task.status ||
      updateAITask.taskInfo !== task.taskInfo ||
      updateAITask.taskResult !== task.taskResult;

    let persistedTask = task;
    if (shouldPersist) {
      const updatedTask = await updateAITaskById(task.id, updateAITask);
      if (updatedTask) {
        persistedTask = updatedTask;
      }
    }

    await sendAITaskCompletionEmailIfNeeded({
      previousStatus,
      task: persistedTask,
    });

    return respData({
      accepted: true,
      provider,
      id: persistedTask.id,
      status: persistedTask.status,
    });
  } catch (error: any) {
    console.log('ai notify failed:', error);
    return respErr(error?.message || 'ai notify failed');
  }
}
