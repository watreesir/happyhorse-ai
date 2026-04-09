import { envConfigs } from '@/config';
import { AIMediaType, AITaskStatus } from '@/extensions/ai';
import { AITaskFinishedEmail } from '@/shared/blocks/email/ai-task-finished';
import { AITask } from '@/shared/models/ai_task';
import { isGuestTrialSystemUserId } from '@/shared/models/guest_trial';
import { findUserById } from '@/shared/models/user';

import { getEmailService } from './email';

function isTerminalStatus(status?: string | null) {
  return (
    status === AITaskStatus.SUCCESS ||
    status === AITaskStatus.FAILED ||
    status === AITaskStatus.CANCELED
  );
}

function normalizeLocale(locale?: string | null) {
  const value = (locale || '').toLowerCase();
  if (value.startsWith('zh')) return 'zh' as const;
  return 'en' as const;
}

function getTaskTypeLabel(task: AITask, locale: 'zh' | 'en') {
  if (locale === 'zh') {
    if (task.mediaType === AIMediaType.VIDEO) return '视频';
    if (task.mediaType === AIMediaType.IMAGE) return '图片';
    if (task.mediaType === AIMediaType.MUSIC) return '音频';
    return '生成';
  }
  if (task.mediaType === AIMediaType.VIDEO) return 'video';
  if (task.mediaType === AIMediaType.IMAGE) return 'image';
  if (task.mediaType === AIMediaType.MUSIC) return 'audio';
  return 'generation';
}

function truncate(input: string, maxLength = 120) {
  const normalized = input.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

function parseJson(input?: string | null): Record<string, any> | null {
  if (!input) return null;
  try {
    const parsed = JSON.parse(input);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function getActionPath(mediaType: string) {
  if (mediaType === AIMediaType.VIDEO) {
    return '/ai-video-studio';
  }
  return '/activity/ai-tasks';
}

function resolveLogoUrl() {
  const appLogo = envConfigs.app_logo || '';
  if (!appLogo) return undefined;
  if (appLogo.startsWith('http')) return appLogo;
  if (!envConfigs.app_url) return undefined;
  return `${envConfigs.app_url}${appLogo.startsWith('/') ? '' : '/'}${appLogo}`;
}

function getRetentionDays(): number | null {
  const raw =
    process.env.TASK_RESULT_RETENTION_DAYS ||
    process.env.NEXT_PUBLIC_TASK_RESULT_RETENTION_DAYS ||
    '';
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function buildCopy({
  locale,
  ready,
  taskTypeLabel,
  appName,
  prompt,
  actionUrl,
  retentionDays,
}: {
  locale: 'zh' | 'en';
  ready: boolean;
  taskTypeLabel: string;
  appName: string;
  prompt: string;
  actionUrl: string;
  retentionDays: number | null;
}) {
  if (locale === 'zh') {
    return {
      subject: ready
        ? `🎉 你的${taskTypeLabel}任务已完成`
        : `⚠️ 你的${taskTypeLabel}任务已结束（需处理）`,
      previewText: ready
        ? `你的${taskTypeLabel}任务已完成`
        : `你的${taskTypeLabel}任务有更新`,
      title: ready
        ? `你的${taskTypeLabel}任务已完成`
        : `你的${taskTypeLabel}任务未成功完成`,
      summary: ready
        ? '好消息，任务已经处理完成。你现在可以前往工作台查看并下载结果。'
        : '任务执行已结束，但结果未成功生成。你可以打开工作台查看详情并重试。',
      detailLine: `入口：${actionUrl}`,
      promptLine: prompt ? `提示词：${prompt}` : undefined,
      retentionLine: retentionDays
        ? `当前结果文件保留策略：约 ${retentionDays} 天（以存储配置为准）。`
        : undefined,
      actionLabel: ready ? '前往查看' : '查看详情',
      footer: `此邮件由 ${appName} 自动发送。如非本人操作，可忽略。`,
    };
  }

  return {
    subject: ready
      ? `🎉 Your ${taskTypeLabel} task is ready`
      : `⚠️ Your ${taskTypeLabel} task finished with an issue`,
    previewText: ready
      ? `Your ${taskTypeLabel} task is ready`
      : `Your ${taskTypeLabel} task has an update`,
    title: ready
      ? `Your ${taskTypeLabel} task is ready`
      : `Your ${taskTypeLabel} task needs attention`,
    summary: ready
      ? 'Good news, your task has finished processing. You can open your workspace to view and download the result.'
      : 'Your task has finished, but it did not complete successfully. Open your workspace to review details and retry.',
    detailLine: `Workspace: ${actionUrl}`,
    promptLine: prompt ? `Prompt: ${prompt}` : undefined,
    retentionLine: retentionDays
      ? `Current result retention target: about ${retentionDays} days (subject to storage policy).`
      : undefined,
    actionLabel: ready ? 'Open Workspace' : 'Review Task',
    footer: `This email was sent automatically by ${appName}. If this wasn't you, you can ignore it.`,
  };
}

export async function sendAITaskCompletionEmailIfNeeded({
  previousStatus,
  task,
}: {
  previousStatus?: string | null;
  task: AITask;
}) {
  try {
    if (isGuestTrialSystemUserId(task.userId)) {
      return;
    }

    if (!isTerminalStatus(task.status)) {
      return;
    }

    if (isTerminalStatus(previousStatus)) {
      return;
    }

    const user = await findUserById(task.userId);
    if (!user?.email) {
      return;
    }

    const locale = normalizeLocale(user.locale);
    const ready = task.status === AITaskStatus.SUCCESS;
    const taskTypeLabel = getTaskTypeLabel(task, locale);
    const prompt = truncate(task.prompt || '');

    const appName = envConfigs.app_name || 'Happy Horse AI';
    const appUrl = envConfigs.app_url || '';
    const actionPath = getActionPath(task.mediaType);
    const actionUrl = appUrl
      ? `${appUrl}${actionPath.startsWith('/') ? actionPath : `/${actionPath}`}`
      : actionPath;

    // Parse once to ensure malformed JSON does not break notification flow.
    parseJson(task.taskInfo);
    parseJson(task.taskResult);

    const retentionDays = getRetentionDays();
    const copy = buildCopy({
      locale,
      ready,
      taskTypeLabel,
      appName,
      prompt,
      actionUrl,
      retentionDays,
    });

    const emailService = await getEmailService();
    await emailService.sendEmail({
      to: user.email,
      subject: copy.subject,
      react: (
        <AITaskFinishedEmail
          appName={appName}
          logoUrl={resolveLogoUrl()}
          previewText={copy.previewText}
          title={copy.title}
          summary={copy.summary}
          detailLine={copy.detailLine}
          promptLine={copy.promptLine}
          retentionLine={copy.retentionLine}
          actionLabel={copy.actionLabel}
          actionUrl={actionUrl}
          footer={copy.footer}
        />
      ),
    });
  } catch (error) {
    console.log('send ai task completion email skipped:', error);
  }
}
