import type {
  VideoStudioMode,
  VideoStudioResolution,
} from './video-studio-workflow';

export type VideoStudioModelKey = 'happyhorse-1.0' | 'wan-2.7';

export type VideoStudioModelOption = {
  key: VideoStudioModelKey;
  label: string;
  provider: 'apimart' | 'kie';
  model: string | Record<VideoStudioMode, string>;
};

export const HAPPYHORSE_MODEL_KEY: VideoStudioModelKey = 'happyhorse-1.0';
export const HAPPYHORSE_PROVIDER = 'apimart';
export const HAPPYHORSE_MODEL = 'happyhorse-1.0';

export const WAN_27_MODEL_KEY: VideoStudioModelKey = 'wan-2.7';
export const WAN_27_PROVIDER = 'kie';

export const WAN_27_MODELS: Record<VideoStudioMode, string> = {
  'text-to-video': 'wan/2-7-text-to-video',
  'image-to-video': 'wan/2-7-image-to-video',
  'reference-to-video': 'wan/2-7-r2v',
  'video-edit': 'wan/2-7-videoedit',
};

export const VIDEO_STUDIO_MODEL_OPTIONS: VideoStudioModelOption[] = [
  {
    key: HAPPYHORSE_MODEL_KEY,
    label: 'HappyHorse 1.0',
    provider: HAPPYHORSE_PROVIDER,
    model: HAPPYHORSE_MODEL,
  },
  {
    key: WAN_27_MODEL_KEY,
    label: 'WAN 2.7',
    provider: WAN_27_PROVIDER,
    model: WAN_27_MODELS,
  },
];

export function isHappyHorseModelKey(modelKey: unknown) {
  return modelKey === HAPPYHORSE_MODEL_KEY;
}

export function isHappyHorseProviderModel(provider?: string, model?: string) {
  return provider === HAPPYHORSE_PROVIDER || model === HAPPYHORSE_MODEL;
}

export function resolveVideoStudioModelKey(
  input: unknown
): VideoStudioModelKey {
  return input === WAN_27_MODEL_KEY ? WAN_27_MODEL_KEY : HAPPYHORSE_MODEL_KEY;
}

export function getVideoStudioModelOption(modelKey: unknown) {
  const key = resolveVideoStudioModelKey(modelKey);
  return (
    VIDEO_STUDIO_MODEL_OPTIONS.find((option) => option.key === key) ??
    VIDEO_STUDIO_MODEL_OPTIONS[0]
  );
}

export function getVideoStudioProvider(modelKey: VideoStudioModelKey) {
  return getVideoStudioModelOption(modelKey).provider;
}

export function getVideoStudioProviderModel(
  modelKey: VideoStudioModelKey,
  mode: VideoStudioMode
) {
  const option = getVideoStudioModelOption(modelKey);
  return typeof option.model === 'string' ? option.model : option.model[mode];
}

export function getVideoStudioModelDisplayName(input: {
  modelKey?: unknown;
  provider?: string;
  model?: string;
}) {
  if (input.modelKey) {
    return getVideoStudioModelOption(input.modelKey).label;
  }

  if (isHappyHorseProviderModel(input.provider, input.model)) {
    return 'HappyHorse 1.0';
  }

  if (
    input.provider === WAN_27_PROVIDER ||
    input.model?.startsWith('wan/2-7-')
  ) {
    return 'WAN 2.7';
  }

  return input.model || 'Unknown Model';
}

export function getHappyHorseRateEnvName(
  resolution: VideoStudioResolution,
  isPublic = false
) {
  const prefix = isPublic ? 'NEXT_PUBLIC_' : '';
  return resolution === '1080p'
    ? `${prefix}HAPPYHORSE_1080P_CREDITS_PER_SECOND`
    : `${prefix}HAPPYHORSE_720P_CREDITS_PER_SECOND`;
}
