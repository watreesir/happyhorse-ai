import { envConfigs } from '@/config';
import { AIMediaType } from '@/extensions/ai';
import { AITaskStatus } from '@/extensions/ai/types';
import { FIXED_AI_TASK_CREDIT_COST } from '@/shared/lib/credits';
import { getUuid } from '@/shared/lib/hash';
import { enforceMinIntervalRateLimit } from '@/shared/lib/rate-limit';
import { respData, respErr } from '@/shared/lib/resp';
import { createAITask, NewAITask, updateAITaskById } from '@/shared/models/ai_task';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';

export async function POST(request: Request) {
  const limited = enforceMinIntervalRateLimit(request, {
    intervalMs: Number(process.env.AI_GENERATE_MIN_INTERVAL_MS) || 1500,
    keyPrefix: 'ai-generate',
  });
  if (limited) {
    return limited;
  }

  let reservedTaskId: string | null = null;
  let reservedCreditId: string | null = null;
  let externalTaskCreated = false;

  try {
    let { provider, mediaType, model, prompt, options, scene } =
      await request.json();

    if (!provider || !mediaType || !model) {
      throw new Error('invalid params');
    }

    if (!prompt && !options) {
      throw new Error('prompt or options is required');
    }

    const aiService = await getAIService();

    // check generate type
    if (!aiService.getMediaTypes().includes(mediaType)) {
      throw new Error('invalid mediaType');
    }

    // check ai provider
    const aiProvider = aiService.getProvider(provider);
    if (!aiProvider) {
      throw new Error('invalid provider');
    }

    // get current user
    const user = await getUserInfo();
    if (!user) {
      throw new Error('no auth, please sign in');
    }

    // MVP: keep all generation scenes at a fixed cost.
    const costCredits = FIXED_AI_TASK_CREDIT_COST;

    if (mediaType === AIMediaType.IMAGE) {
      // generate image
      if (scene !== 'image-to-image' && scene !== 'text-to-image') {
        throw new Error('invalid scene');
      }
    } else if (mediaType === AIMediaType.VIDEO) {
      // generate video
      if (
        scene !== 'text-to-video' &&
        scene !== 'image-to-video' &&
        scene !== 'video-to-video'
      ) {
        throw new Error('invalid scene');
      }
    } else if (mediaType === AIMediaType.MUSIC) {
      // generate music
      scene = 'text-to-music';
    } else {
      throw new Error('invalid mediaType');
    }

    const callbackUrl = `${envConfigs.app_url}/api/ai/notify/${provider}`;

    // Reserve credits first in a DB transaction before calling external provider.
    // This prevents "generate first, charge later" race conditions under concurrent requests.
    const newAITask: NewAITask = {
      id: getUuid(),
      userId: user.id,
      mediaType,
      provider,
      model,
      prompt: prompt || '',
      scene,
      options: options ? JSON.stringify(options) : null,
      status: AITaskStatus.PENDING,
      costCredits,
      taskId: null,
      taskInfo: null,
      taskResult: null,
    };
    const reservedTask = await createAITask(newAITask);
    reservedTaskId = reservedTask.id;
    reservedCreditId = reservedTask.creditId || null;

    const params: any = {
      mediaType,
      model,
      prompt,
      callbackUrl,
      options,
    };

    // generate content
    const result = await aiProvider.generate({ params });
    if (!result?.taskId) {
      throw new Error(
        `ai generate failed, mediaType: ${mediaType}, provider: ${provider}, model: ${model}`
      );
    }
    externalTaskCreated = true;

    const updatedTask = await updateAITaskById(reservedTask.id, {
      status: result.taskStatus || AITaskStatus.PENDING,
      taskId: result.taskId,
      taskInfo: result.taskInfo ? JSON.stringify(result.taskInfo) : null,
      taskResult: result.taskResult ? JSON.stringify(result.taskResult) : null,
    });

    if (!updatedTask) {
      throw new Error('failed to persist generated task');
    }

    return respData(updatedTask);
  } catch (e: any) {
    const errorMessage = e?.message || 'generate failed';

    if (reservedTaskId) {
      try {
        // Refund credits only when external generation was not started successfully.
        // If provider has already accepted the task, keep the charge to avoid free-cost abuse.
        if (reservedCreditId && !externalTaskCreated) {
          await updateAITaskById(reservedTaskId, {
            status: AITaskStatus.FAILED,
            creditId: reservedCreditId,
            taskInfo: JSON.stringify({ errorMessage }),
            taskResult: null,
          });
        } else {
          await updateAITaskById(reservedTaskId, {
            status: AITaskStatus.FAILED,
            taskInfo: JSON.stringify({ errorMessage }),
          });
        }
      } catch (rollbackError) {
        console.error('failed to finalize reserved task after generate error:', rollbackError);
      }
    }

    console.log('generate failed', e);
    if (
      typeof errorMessage === 'string' &&
      errorMessage.toLowerCase().includes('insufficient credits')
    ) {
      return respErr('insufficient credits');
    }
    return respErr(errorMessage);
  }
}
