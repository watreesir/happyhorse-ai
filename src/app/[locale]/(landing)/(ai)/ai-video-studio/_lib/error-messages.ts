import { StudioErrorCopy } from './types';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message || '';
  }
  if (typeof error === 'string') {
    return error;
  }
  return '';
}

function getHttpStatus(message: string) {
  const matched = message.match(/status:\s*(\d{3})/i);
  if (!matched?.[1]) return null;
  const parsed = Number.parseInt(matched[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toStudioErrorMessage(
  error: unknown,
  copy: StudioErrorCopy,
  fallback: keyof Pick<
    StudioErrorCopy,
    'submitFailed' | 'queryFailed' | 'listFailed'
  >
) {
  const rawMessage = getErrorMessage(error);
  const message = rawMessage.toLowerCase();
  const status = getHttpStatus(rawMessage);

  if (
    message.includes('no auth') ||
    message.includes('sign in') ||
    status === 401
  ) {
    return copy.authRequired;
  }

  if (message.includes('insufficient credit')) {
    return copy.creditsInsufficient;
  }

  if (
    status === 413 ||
    message.includes('upload too large') ||
    message.includes('payload too large') ||
    message.includes('entity too large')
  ) {
    return copy.uploadTooLarge;
  }

  if (message.includes('no permission') || status === 403) {
    return copy.permissionDenied;
  }

  if (message.includes('task not found') || status === 404) {
    return copy.taskUnavailable;
  }

  if (status === 429 || message.includes('too many request')) {
    return copy.rateLimited;
  }

  if (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network request failed') ||
    message.includes('enotfound')
  ) {
    return copy.networkIssue;
  }

  if (status !== null && status >= 500) {
    return copy.serverBusy;
  }

  return copy[fallback];
}
