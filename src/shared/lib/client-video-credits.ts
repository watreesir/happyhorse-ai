import { isHappyHorseModelKey } from './video-models';

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function getClientVideoCreditRatePerSecond(
  resolution: '720p' | '1080p',
  modelKey?: string
) {
  if (isHappyHorseModelKey(modelKey)) {
    if (resolution === '1080p') {
      return parsePositiveInt(
        process.env.NEXT_PUBLIC_HAPPYHORSE_1080P_CREDITS_PER_SECOND,
        25
      );
    }
    return parsePositiveInt(
      process.env.NEXT_PUBLIC_HAPPYHORSE_720P_CREDITS_PER_SECOND,
      20
    );
  }

  if (resolution === '1080p') {
    return parsePositiveInt(
      process.env.NEXT_PUBLIC_AI_VIDEO_1080P_CREDITS_PER_SECOND,
      2
    );
  }

  return parsePositiveInt(
    process.env.NEXT_PUBLIC_AI_VIDEO_720P_CREDITS_PER_SECOND,
    1
  );
}

export function getClientVideoCreditsCost({
  resolution,
  durationSeconds,
  modelKey,
}: {
  resolution: '720p' | '1080p';
  durationSeconds: number;
  modelKey?: string;
}) {
  const safeDuration = Math.max(1, Math.ceil(durationSeconds || 0 || 5));
  return getClientVideoCreditRatePerSecond(resolution, modelKey) * safeDuration;
}
