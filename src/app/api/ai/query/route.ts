import { respData, respErr } from '@/shared/lib/resp';
import {
  findAITaskById,
  UpdateAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
import {
  canGuestAccessTask,
  getGuestTrialTokenFromRequest,
} from '@/shared/models/guest_trial';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';
import { sendAITaskCompletionEmailIfNeeded } from '@/shared/services/ai-task-notify';

export async function POST(req: Request) {
  try {
    const { taskId } = await req.json();
    if (!taskId) {
      return respErr('invalid params');
    }

    const user = await getUserInfo();
    const guestToken = user ? '' : getGuestTrialTokenFromRequest(req);
    if (!user && !guestToken) {
      return respErr('no auth, please sign in');
    }

    const task = await findAITaskById(taskId);
    if (!task || !task.taskId) {
      return respErr('task not found');
    }

    if (user) {
      if (task.userId !== user.id) {
        return respErr('no permission');
      }
    } else {
      const hasAccess = await canGuestAccessTask({
        token: guestToken,
        taskId: task.id,
      });
      if (!hasAccess) {
        return respErr('no permission');
      }
    }

    const aiService = await getAIService();
    const aiProvider = aiService.getProvider(task.provider);
    if (!aiProvider) {
      return respErr('invalid ai provider');
    }

    const result = await aiProvider?.query?.({
      taskId: task.taskId,
      mediaType: task.mediaType,
      model: task.model,
    });

    if (!result?.taskStatus) {
      return respErr('query ai task failed');
    }

    const previousStatus = task.status;

    // update ai task
    const updateAITask: UpdateAITask = {
      status: result.taskStatus,
      taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
      taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
      creditId: task.creditId, // credit consumption record id
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

    return respData(persistedTask);
  } catch (e: any) {
    console.log('ai query failed', e);
    return respErr(e.message);
  }
}
