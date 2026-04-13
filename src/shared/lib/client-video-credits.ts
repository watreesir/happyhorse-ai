function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function getClientVideoCreditRatePerSecond(
  resolution: '720p' | '1080p'
) {
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
}: {
  resolution: '720p' | '1080p';
  durationSeconds: number;
}) {
  const safeDuration = Math.max(1, Math.ceil(durationSeconds || 0 || 5));
  return getClientVideoCreditRatePerSecond(resolution) * safeDuration;
}
