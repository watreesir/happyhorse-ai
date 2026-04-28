export const PROMPT_MODERATION_DENIED_MESSAGE =
  'Sorry, prompt not processed. Please revise and resubmit.';

export function isPromptModerationDeniedMessage(message: string) {
  return message.toLowerCase().includes('prompt not processed');
}

export function toSubmissionErrorToastMessage(message: string) {
  return `Submission error: ${message || PROMPT_MODERATION_DENIED_MESSAGE}`;
}
