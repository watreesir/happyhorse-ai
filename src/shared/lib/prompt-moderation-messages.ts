import { ApiResponseError } from '@/shared/lib/api-client';

export const PROMPT_MODERATION_DENIED_MESSAGE =
  'Sorry, prompt not processed. Please revise and resubmit.';

const PROMPT_MODERATION_ERROR_PREFIX = 'PROMPT_MODERATION_';

export function isPromptModerationErrorCode(errorCode: unknown) {
  return (
    typeof errorCode === 'string' &&
    errorCode.startsWith(PROMPT_MODERATION_ERROR_PREFIX)
  );
}

export function isPromptModerationApiError(error: unknown) {
  return (
    error instanceof ApiResponseError &&
    isPromptModerationErrorCode(error.errorCode)
  );
}

export function isPromptModerationDeniedMessage(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('prompt not processed') ||
    normalized.includes('safety check is temporarily unavailable')
  );
}

export function toSubmissionErrorToastMessage(message: string) {
  return `Submission error: ${message || PROMPT_MODERATION_DENIED_MESSAGE}`;
}
