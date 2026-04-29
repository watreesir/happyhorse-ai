import { cookies } from 'next/headers';

import { envConfigs } from '@/config';
import { AIMediaType } from '@/extensions/ai';
import { AITaskStatus } from '@/extensions/ai/types';
import { FIXED_AI_TASK_CREDIT_COST } from '@/shared/lib/credits';
import { getUuid } from '@/shared/lib/hash';
import { getClientIp } from '@/shared/lib/ip';
import { enforceMinIntervalRateLimit } from '@/shared/lib/rate-limit';
import { respData, respErr } from '@/shared/lib/resp';
import { isHappyHorseProviderModel } from '@/shared/lib/video-models';
import {
  createAITask,
  NewAITask,
  updateAITaskById,
} from '@/shared/models/ai_task';
import { getAllConfigs } from '@/shared/models/config';
import { claimDailyCreditsForUser } from '@/shared/models/credit';
import {
  ensureGuestTrialSystemUser,
  GUEST_DEVICE_ID_COOKIE,
  GUEST_TRIAL_COOKIE_MAX_AGE_SECONDS,
  GUEST_TRIAL_TOKEN_COOKIE,
  linkGuestTaskToToken,
  refundGuestTrialCredits,
  reserveGuestTrialCredits,
} from '@/shared/models/guest_trial';
import { getUserInfo } from '@/shared/models/user';
import { getAIService } from '@/shared/services/ai';
import { sendAITaskCompletionEmailIfNeeded } from '@/shared/services/ai-task-notify';
import {
  buildModerationPrompt,
  collectAIGenerationModerationTexts,
  isPromptModerationError,
  moderatePrompt,
  PROMPT_REQUIRED_MESSAGE,
  PromptModerationError,
  sanitizeExternalIdSegment,
} from '@/shared/services/creem-moderation';
import {
  calculateVideoCreditsCost,
  getPricingSnapshot,
} from '@/shared/services/pricing';

const GUEST_TRIAL_ENABLED = process.env.GUEST_TRIAL_ENABLED !== 'false';

function resolveVideoCreditsCost({
  provider,
  model,
  options,
}: {
  provider: string;
  model: string;
  options: Record<string, any> | undefined;
}) {
  const resolution = options?.resolution === '720p' ? '720p' : '1080p';
  const isHappyHorse = isHappyHorseProviderModel(provider, model);
  const isHappyHorseEdit = isHappyHorse && typeof options?.video_url === 'string';
  const billingDurationSource = isHappyHorseEdit
    ? options?.source_duration
    : options?.duration;
  const rawDuration =
    typeof billingDurationSource === 'number'
      ? billingDurationSource
      : typeof billingDurationSource === 'string'
        ? Number.parseFloat(billingDurationSource)
        : Number.NaN;
  const defaultDurationSeconds = isHappyHorseEdit ? 15 : 5;
  const normalizedDuration =
    Number.isFinite(rawDuration) && rawDuration > 0
      ? rawDuration
      : defaultDurationSeconds;
  const durationSeconds = isHappyHorseEdit
    ? Math.min(15, Math.max(3, normalizedDuration))
    : normalizedDuration;

  return calculateVideoCreditsCost({
    resolution,
    durationSeconds,
    model,
  });
}

async function getGuestIdentity() {
  const cookieStore = await cookies();
  let token = cookieStore.get(GUEST_TRIAL_TOKEN_COOKIE)?.value?.trim() || '';
  let deviceId = cookieStore.get(GUEST_DEVICE_ID_COOKIE)?.value?.trim() || '';

  const secure = process.env.NODE_ENV === 'production';

  if (!token) {
    token = getUuid();
    cookieStore.set({
      name: GUEST_TRIAL_TOKEN_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: GUEST_TRIAL_COOKIE_MAX_AGE_SECONDS,
    });
  }

  if (!deviceId) {
    deviceId = getUuid();
    cookieStore.set({
      name: GUEST_DEVICE_ID_COOKIE,
      value: deviceId,
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: GUEST_TRIAL_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return { token, deviceId };
}

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
  let reservedGuestToken: string | null = null;
  let reservedGuestCredits = 0;
  let isGuestTask = false;
  let externalTaskCreated = false;

  try {
    let { provider, mediaType, model, prompt, options, scene } =
      await request.json();

    if (!provider || !mediaType || !model) {
      throw new Error('invalid params');
    }

    const moderationTexts = collectAIGenerationModerationTexts({
      prompt,
      options,
    });
    if (moderationTexts.length === 0) {
      throw new PromptModerationError({
        code: 'PROMPT_MODERATION_REQUIRED',
        message: PROMPT_REQUIRED_MESSAGE,
        status: 400,
      });
    }

    const configs = await getAllConfigs();
    const aiService = await getAIService(configs);

    // check generate type
    if (!aiService.getMediaTypes().includes(mediaType)) {
      throw new Error('invalid mediaType');
    }

    // check ai provider
    const aiProvider = aiService.getProvider(provider);
    if (!aiProvider) {
      throw new Error('invalid provider');
    }

    let costCredits = FIXED_AI_TASK_CREDIT_COST;

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

      costCredits = resolveVideoCreditsCost({ provider, model, options });
    } else if (mediaType === AIMediaType.MUSIC) {
      // generate music
      scene = 'text-to-music';
    } else {
      throw new Error('invalid mediaType');
    }

    const user = await getUserInfo();
    if (!user && (!GUEST_TRIAL_ENABLED || mediaType !== AIMediaType.VIDEO)) {
      throw new Error('no auth, please sign in');
    }

    await moderatePrompt({
      configs,
      prompt: buildModerationPrompt(moderationTexts),
      externalId: [
        'happyhorse-ai',
        `media_${sanitizeExternalIdSegment(mediaType)}`,
        `scene_${sanitizeExternalIdSegment(scene)}`,
        `provider_${sanitizeExternalIdSegment(provider)}`,
        `model_${sanitizeExternalIdSegment(model)}`,
        user?.id ? `user_${sanitizeExternalIdSegment(user.id)}` : 'guest',
        `req_${sanitizeExternalIdSegment(getUuid())}`,
      ].join(':'),
    });

    let taskUserId = user?.id || '';

    if (!user) {
      const guestIdentity = await getGuestIdentity();
      const ip = await getClientIp();

      await reserveGuestTrialCredits({
        token: guestIdentity.token,
        deviceId: guestIdentity.deviceId,
        ip,
        userAgent: request.headers.get('user-agent') || '',
        acceptLanguage: request.headers.get('accept-language') || '',
        credits: costCredits,
      });

      taskUserId = await ensureGuestTrialSystemUser();
      reservedGuestToken = guestIdentity.token;
      reservedGuestCredits = costCredits;
      isGuestTask = true;
      costCredits = 0;
    } else if (mediaType === AIMediaType.VIDEO) {
      const pricingSnapshot = await getPricingSnapshot(user.id);

      if (pricingSnapshot.freeDailyEligible) {
        await claimDailyCreditsForUser(user);
      }
    }

    const callbackUrl = `${envConfigs.app_url}/api/ai/notify/${provider}`;

    // Reserve credits first in a DB transaction before calling external provider.
    // This prevents "generate first, charge later" race conditions under concurrent requests.
    const newAITask: NewAITask = {
      id: getUuid(),
      userId: taskUserId,
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
    if (isGuestTask && reservedGuestToken) {
      await linkGuestTaskToToken({
        token: reservedGuestToken,
        taskId: reservedTask.id,
      });
    }

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

    await sendAITaskCompletionEmailIfNeeded({
      previousStatus: reservedTask.status,
      task: updatedTask,
    });

    return respData(updatedTask);
  } catch (e: any) {
    const errorMessage = e?.message || 'generate failed';

    if (isPromptModerationError(e)) {
      return respErr(errorMessage, {
        status: e.status,
        data: {
          errorCode: e.code,
        },
      });
    }

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
        console.error(
          'failed to finalize reserved task after generate error:',
          rollbackError
        );
      }
    }

    if (
      isGuestTask &&
      reservedGuestToken &&
      reservedGuestCredits > 0 &&
      !externalTaskCreated
    ) {
      try {
        await refundGuestTrialCredits({
          token: reservedGuestToken,
          credits: reservedGuestCredits,
        });
      } catch (refundError) {
        console.error('failed to refund guest trial credits:', refundError);
      }
    }

    console.log('generate failed', e);
    if (
      typeof errorMessage === 'string' &&
      errorMessage.toLowerCase().includes('insufficient credits')
    ) {
      return respErr(errorMessage);
    }
    return respErr(errorMessage);
  }
}
