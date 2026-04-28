import { isProduction } from '@/shared/lib/env';
import { Configs } from '@/shared/models/config';

export type CreemModerationDecision = 'allow' | 'flag' | 'deny';

export type PromptModerationErrorCode =
  | 'PROMPT_MODERATION_DENIED'
  | 'PROMPT_MODERATION_FLAGGED'
  | 'PROMPT_MODERATION_UNAVAILABLE'
  | 'PROMPT_MODERATION_REQUIRED';

export const PROMPT_MODERATION_DENIED_MESSAGE =
  'Sorry, prompt not processed. Please revise and resubmit.';

export const PROMPT_MODERATION_UNAVAILABLE_MESSAGE =
  'Safety check is temporarily unavailable. Please try again later.';

export const PROMPT_REQUIRED_MESSAGE = 'Please add a prompt before generating.';

export class PromptModerationError extends Error {
  code: PromptModerationErrorCode;
  status: number;

  constructor({
    code,
    message,
    status,
  }: {
    code: PromptModerationErrorCode;
    message: string;
    status: number;
  }) {
    super(message);
    this.name = 'PromptModerationError';
    this.code = code;
    this.status = status;
  }
}

export type PromptModerationText = {
  key: string;
  text: string;
};

type PromptModerationResult = {
  id?: string;
  object?: string;
  prompt?: string;
  decision: CreemModerationDecision;
  usage?: {
    units?: number;
  };
  external_id?: string;
};

const TEXT_OPTION_KEYS = new Set([
  'caption',
  'content',
  'description',
  'lyrics',
  'multi_prompt',
  'multiPrompt',
  'name',
  'negative_prompt',
  'negativePrompt',
  'negativeTags',
  'prompt',
  'style',
  'text',
  'title',
]);

function readConfig(
  configs: Configs,
  key: string,
  envKey: string,
  fallback = ''
) {
  return configs[key] || process.env[envKey] || fallback;
}

function readBooleanConfig(
  configs: Configs,
  key: string,
  envKey: string,
  fallback: boolean
) {
  const value = readConfig(configs, key, envKey);
  if (!value) return fallback;
  return value === 'true';
}

function readPositiveIntConfig(
  configs: Configs,
  key: string,
  envKey: string,
  fallback: number
) {
  const value = Number.parseInt(readConfig(configs, key, envKey), 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function normalizeBaseUrl(baseUrl: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, '');
  if (!normalized) return 'https://api.creem.io';
  if (normalized.endsWith('/v1')) {
    return normalized.slice(0, -3);
  }
  return normalized;
}

function getForcedDecision(): CreemModerationDecision | null {
  if (isProduction) return null;
  const decision = process.env.CREEM_MODERATION_FORCE_DECISION;
  if (decision === 'allow' || decision === 'flag' || decision === 'deny') {
    return decision;
  }
  return null;
}

function normalizeText(input: unknown) {
  return typeof input === 'string' ? input.replace(/\s+/g, ' ').trim() : '';
}

function addText(texts: PromptModerationText[], key: string, value: unknown) {
  if (typeof value === 'string') {
    const text = normalizeText(value);
    if (text) texts.push({ key, text });
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      addText(texts, `${key}.${index}`, item);
    });
    return;
  }

  if (value && typeof value === 'object') {
    collectOptionTexts(value as Record<string, unknown>, texts, key);
  }
}

function collectOptionTexts(
  source: Record<string, unknown>,
  texts: PromptModerationText[],
  prefix = 'options'
) {
  Object.entries(source).forEach(([key, value]) => {
    const path = `${prefix}.${key}`;
    if (TEXT_OPTION_KEYS.has(key)) {
      addText(texts, path, value);
      return;
    }

    if (value && typeof value === 'object') {
      collectOptionTexts(value as Record<string, unknown>, texts, path);
    }
  });
}

export function collectAIGenerationModerationTexts({
  prompt,
  options,
}: {
  prompt?: unknown;
  options?: unknown;
}) {
  const texts: PromptModerationText[] = [];
  addText(texts, 'prompt', prompt);

  if (options && typeof options === 'object') {
    collectOptionTexts(options as Record<string, unknown>, texts);
  }

  const seen = new Set<string>();
  return texts.filter((item) => {
    const fingerprint = `${item.key}:${item.text}`;
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

export function buildModerationPrompt(texts: PromptModerationText[]) {
  return texts.map((item) => `${item.key}: ${item.text}`).join('\n\n');
}

export function sanitizeExternalIdSegment(input: unknown) {
  const value = String(input || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return value.slice(0, 80) || 'unknown';
}

export function isPromptModerationError(
  error: unknown
): error is PromptModerationError {
  return error instanceof PromptModerationError;
}

export async function moderatePrompt({
  configs,
  prompt,
  externalId,
}: {
  configs: Configs;
  prompt: string;
  externalId: string;
}): Promise<PromptModerationResult | null> {
  const enabled = readBooleanConfig(
    configs,
    'creem_moderation_enabled',
    'CREEM_MODERATION_ENABLED',
    false
  );
  if (!enabled) {
    return null;
  }

  const blockFlag = readBooleanConfig(
    configs,
    'creem_moderation_block_flag',
    'CREEM_MODERATION_BLOCK_FLAG',
    true
  );
  const forcedDecision = getForcedDecision();

  let result: PromptModerationResult;
  if (forcedDecision) {
    console.log('[creem-moderation] forcing moderation decision', {
      decision: forcedDecision,
      externalId,
    });
    result = {
      id: `forced-${forcedDecision}`,
      object: 'moderation_result',
      decision: forcedDecision,
      external_id: externalId,
    };
  } else {
    const apiKey = readConfig(
      configs,
      'creem_moderation_api_key',
      'CREEM_MODERATION_API_KEY'
    );
    if (!apiKey) {
      console.log('[creem-moderation] api key missing');
      throw new PromptModerationError({
        code: 'PROMPT_MODERATION_UNAVAILABLE',
        message: PROMPT_MODERATION_UNAVAILABLE_MESSAGE,
        status: 503,
      });
    }

    const baseUrl = normalizeBaseUrl(
      readConfig(
        configs,
        'creem_moderation_api_base',
        'CREEM_MODERATION_API_BASE',
        'https://api.creem.io'
      )
    );
    const timeoutMs = readPositiveIntConfig(
      configs,
      'creem_moderation_timeout_ms',
      'CREEM_MODERATION_TIMEOUT_MS',
      5000
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/v1/moderation/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          prompt,
          external_id: externalId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`moderation_http_${response.status}`);
      }

      result = (await response.json()) as PromptModerationResult;
    } catch (error) {
      console.log('[creem-moderation] unavailable', {
        externalId,
        error,
      });
      throw new PromptModerationError({
        code: 'PROMPT_MODERATION_UNAVAILABLE',
        message: PROMPT_MODERATION_UNAVAILABLE_MESSAGE,
        status: 503,
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  if (!['allow', 'flag', 'deny'].includes(result.decision)) {
    console.log('[creem-moderation] unexpected decision', {
      externalId,
      moderationId: result.id,
      decision: result.decision,
    });
    throw new PromptModerationError({
      code: 'PROMPT_MODERATION_UNAVAILABLE',
      message: PROMPT_MODERATION_UNAVAILABLE_MESSAGE,
      status: 503,
    });
  }

  if (result.decision === 'deny') {
    console.log('[creem-moderation] prompt denied', {
      externalId,
      moderationId: result.id,
    });
    throw new PromptModerationError({
      code: 'PROMPT_MODERATION_DENIED',
      message: PROMPT_MODERATION_DENIED_MESSAGE,
      status: 400,
    });
  }

  if (result.decision === 'flag') {
    console.log('[creem-moderation] prompt flagged', {
      externalId,
      moderationId: result.id,
      blocked: blockFlag,
    });
    if (blockFlag) {
      throw new PromptModerationError({
        code: 'PROMPT_MODERATION_FLAGGED',
        message: PROMPT_MODERATION_DENIED_MESSAGE,
        status: 400,
      });
    }
  }

  return result;
}
