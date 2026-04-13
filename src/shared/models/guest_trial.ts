import { createHash } from 'crypto';
import { and, count, desc, eq, gt } from 'drizzle-orm';

import { db } from '@/core/db';
import {
  aiTask,
  guestTrialQuota,
  guestTrialTask,
  user as userTable,
} from '@/config/db/schema';
import { AIMediaType } from '@/extensions/ai';
import { getCookieFromHeader } from '@/shared/lib/cookie';
import { getUuid } from '@/shared/lib/hash';
import {
  getFreeDailyCreditsAmount,
  getFreeDailyVideoLimit,
} from '@/shared/services/pricing';

export const GUEST_TRIAL_TOKEN_COOKIE = 'hh_guest_trial_token';
export const GUEST_DEVICE_ID_COOKIE = 'hh_guest_device_id';
export const GUEST_TRIAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const RISK_WINDOW_MS = 24 * 60 * 60 * 1000;
const GUEST_TRIAL_TIMEZONE = process.env.GUEST_TRIAL_TIMEZONE || 'Asia/Shanghai';
const GUEST_TRIAL_SYSTEM_USER_ID =
  process.env.GUEST_TRIAL_SYSTEM_USER_ID?.trim() || 'guest-trial-system-user';
const GUEST_TRIAL_SYSTEM_USER_EMAIL =
  process.env.GUEST_TRIAL_SYSTEM_USER_EMAIL?.trim() ||
  'guest-trial-system@happyhorse.invalid';

function parsePositiveInt(input: string | undefined, fallback: number) {
  const parsed = Number.parseInt(input ?? '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

const GUEST_TRIAL_MAX_NEW_TOKENS_PER_IP_24H = parsePositiveInt(
  process.env.GUEST_TRIAL_MAX_NEW_TOKENS_PER_IP_24H,
  3
);
const GUEST_TRIAL_MAX_NEW_TOKENS_PER_DEVICE_24H = parsePositiveInt(
  process.env.GUEST_TRIAL_MAX_NEW_TOKENS_PER_DEVICE_24H,
  2
);

type GuestTrialQuotaRow = typeof guestTrialQuota.$inferSelect;

function getGuestTrialTotalCredits() {
  return parsePositiveInt(
    process.env.GUEST_TRIAL_TOTAL_CREDITS,
    getFreeDailyCreditsAmount()
  );
}

function getGuestTrialMaxTasks() {
  return parsePositiveInt(
    process.env.GUEST_TRIAL_MAX_TASKS,
    getFreeDailyVideoLimit()
  );
}

function hashValue(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

function toInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return 0;
}

function normalizeHeaderValue(value: string | null | undefined) {
  return (value || '').trim().slice(0, 512);
}

function parseDate(input: unknown, fallback: Date) {
  if (input instanceof Date && Number.isFinite(input.getTime())) {
    return input;
  }
  if (typeof input === 'string' || typeof input === 'number') {
    const parsed = new Date(input);
    if (Number.isFinite(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
}

function getDateKey(
  date: Date = new Date(),
  timeZone: string = GUEST_TRIAL_TIMEZONE
) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function toGuestTokenHash(token: string) {
  return hashValue(`token:${token.trim()}`);
}

function toIpHash(ip: string) {
  return hashValue(`ip:${normalizeHeaderValue(ip) || 'unknown'}`);
}

function toDeviceHash({
  deviceId,
  userAgent,
  acceptLanguage,
}: {
  deviceId: string;
  userAgent: string;
  acceptLanguage: string;
}) {
  return hashValue(
    [
      `device:${normalizeHeaderValue(deviceId)}`,
      `ua:${normalizeHeaderValue(userAgent)}`,
      `lang:${normalizeHeaderValue(acceptLanguage)}`,
    ].join('|')
  );
}

function getQuotaByTokenHash(
  tokenHash: string,
  tx: any
): Promise<GuestTrialQuotaRow | null> {
  return tx
    .select()
    .from(guestTrialQuota)
    .where(eq(guestTrialQuota.tokenHash, tokenHash))
    .limit(1)
    .for('update')
    .then((rows: GuestTrialQuotaRow[]) => rows[0] || null);
}

async function createQuotaIfNeeded({
  tokenHash,
  ipHash,
  deviceHash,
  now,
  tx,
}: {
  tokenHash: string;
  ipHash: string;
  deviceHash: string;
  now: Date;
  tx: any;
}) {
  let quota = await getQuotaByTokenHash(tokenHash, tx);
  let created = false;
  if (quota) {
    return { quota, created };
  }

  const windowStart = new Date(now.getTime() - RISK_WINDOW_MS);

  const [ipRow] = await tx
    .select({ count: count() })
    .from(guestTrialQuota)
    .where(
      and(
        eq(guestTrialQuota.ipHash, ipHash),
        gt(guestTrialQuota.createdAt, windowStart)
      )
    );
  const ipCount = toInt(ipRow?.count);
  if (ipCount >= GUEST_TRIAL_MAX_NEW_TOKENS_PER_IP_24H) {
    throw new Error('guest trial risk blocked, please sign in');
  }

  const [deviceRow] = await tx
    .select({ count: count() })
    .from(guestTrialQuota)
    .where(
      and(
        eq(guestTrialQuota.deviceHash, deviceHash),
        gt(guestTrialQuota.createdAt, windowStart)
      )
    );
  const deviceCount = toInt(deviceRow?.count);
  if (deviceCount >= GUEST_TRIAL_MAX_NEW_TOKENS_PER_DEVICE_24H) {
    throw new Error('guest trial risk blocked, please sign in');
  }

  const newQuota = {
    id: getUuid(),
    tokenHash,
    deviceHash,
    ipHash,
    remainingCredits: getGuestTrialTotalCredits(),
    usedTaskCount: 0,
    blocked: false,
    blockReason: null,
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
    consumedAt: null,
  };

  const [createdQuota] = await tx.insert(guestTrialQuota).values(newQuota).returning();
  quota = createdQuota || newQuota;
  created = true;

  return { quota, created };
}

async function syncDailyCredits({
  quota,
  now,
  tx,
}: {
  quota: GuestTrialQuotaRow;
  now: Date;
  tx: any;
}) {
  const dayKey = getDateKey(now);
  const quotaLastSeenAt = parseDate(
    quota.lastSeenAt || quota.updatedAt || quota.createdAt,
    now
  );
  const quotaDayKey = getDateKey(quotaLastSeenAt);

  if (quotaDayKey !== dayKey) {
    const [updatedQuota] = await tx
      .update(guestTrialQuota)
      .set({
        remainingCredits: getGuestTrialTotalCredits(),
        usedTaskCount: 0,
        lastSeenAt: now,
        consumedAt: null,
      })
      .where(eq(guestTrialQuota.id, quota.id))
      .returning();

    return {
      quota:
        updatedQuota ||
        ({
          ...quota,
          remainingCredits: getGuestTrialTotalCredits(),
          usedTaskCount: 0,
          lastSeenAt: now,
          consumedAt: null,
        } as GuestTrialQuotaRow),
      claimedDaily: true,
      dayKey,
    };
  }

  const [updatedQuota] = await tx
    .update(guestTrialQuota)
    .set({ lastSeenAt: now })
    .where(eq(guestTrialQuota.id, quota.id))
    .returning();

  return {
    quota: updatedQuota || quota,
    claimedDaily: false,
    dayKey,
  };
}

export function getGuestTrialTokenFromRequest(request: Request) {
  const token = getCookieFromHeader(
    request.headers.get('cookie'),
    GUEST_TRIAL_TOKEN_COOKIE
  );
  return token?.trim() || '';
}

export function isGuestTrialSystemUserId(userId: string | null | undefined) {
  return !!userId && userId === GUEST_TRIAL_SYSTEM_USER_ID;
}

export function isGuestTrialSystemEmail(email: string | null | undefined) {
  return !!email && email === GUEST_TRIAL_SYSTEM_USER_EMAIL;
}

export async function ensureGuestTrialSystemUser(tx?: any) {
  const executor = tx || db();
  await executor
    .insert(userTable)
    .values({
      id: GUEST_TRIAL_SYSTEM_USER_ID,
      name: 'Guest Trial',
      email: GUEST_TRIAL_SYSTEM_USER_EMAIL,
      emailVerified: false,
      utmSource: 'guest_trial',
      ip: '',
      locale: '',
    })
    .onConflictDoNothing();
  return GUEST_TRIAL_SYSTEM_USER_ID;
}

export async function ensureGuestTrialSession({
  token,
  deviceId,
  ip,
  userAgent,
  acceptLanguage,
}: {
  token: string;
  deviceId: string;
  ip: string;
  userAgent: string;
  acceptLanguage: string;
}) {
  const tokenHash = toGuestTokenHash(token);
  const ipHash = toIpHash(ip);
  const deviceHash = toDeviceHash({ deviceId, userAgent, acceptLanguage });
  const now = new Date();

  return db().transaction(async (tx: any) => {
    const { quota, created } = await createQuotaIfNeeded({
      tokenHash,
      ipHash,
      deviceHash,
      now,
      tx,
    });

    if (!quota) {
      throw new Error('guest trial unavailable, please sign in');
    }

    if (quota.blocked) {
      throw new Error('guest trial risk blocked, please sign in');
    }

    if (created) {
      return {
        remainingCredits: toInt(quota.remainingCredits),
        totalCredits: getGuestTrialTotalCredits(),
        usedTaskCount: toInt(quota.usedTaskCount),
        claimedDaily: true,
        dayKey: getDateKey(now),
      };
    }

    const synced = await syncDailyCredits({ quota, now, tx });

    return {
      remainingCredits: toInt(synced.quota.remainingCredits),
        totalCredits: getGuestTrialTotalCredits(),
      usedTaskCount: toInt(synced.quota.usedTaskCount),
      claimedDaily: synced.claimedDaily,
      dayKey: synced.dayKey,
    };
  });
}

export async function reserveGuestTrialCredits({
  token,
  deviceId,
  ip,
  userAgent,
  acceptLanguage,
  credits,
}: {
  token: string;
  deviceId: string;
  ip: string;
  userAgent: string;
  acceptLanguage: string;
  credits: number;
}) {
  const safeCredits = Math.max(1, Math.floor(credits));
  const tokenHash = toGuestTokenHash(token);
  const ipHash = toIpHash(ip);
  const deviceHash = toDeviceHash({ deviceId, userAgent, acceptLanguage });
  const now = new Date();

  return db().transaction(async (tx: any) => {
    const { quota } = await createQuotaIfNeeded({
      tokenHash,
      ipHash,
      deviceHash,
      now,
      tx,
    });

    if (!quota) {
      throw new Error('guest trial unavailable, please sign in');
    }

    if (quota.blocked) {
      throw new Error('guest trial risk blocked, please sign in');
    }

    const synced = await syncDailyCredits({ quota, now, tx });
    const activeQuota = synced.quota;
    const remainingCredits = toInt(activeQuota.remainingCredits);
    const usedTaskCount = toInt(activeQuota.usedTaskCount);

    if (
      usedTaskCount >= getGuestTrialMaxTasks() ||
      remainingCredits < safeCredits
    ) {
      throw new Error('guest trial exhausted, please sign in');
    }

    const nextRemainingCredits = Math.max(0, remainingCredits - safeCredits);
    const nextUsedTaskCount = usedTaskCount + 1;

    const [updatedQuota] = await tx
      .update(guestTrialQuota)
      .set({
        remainingCredits: nextRemainingCredits,
        usedTaskCount: nextUsedTaskCount,
        ipHash,
        deviceHash,
        lastSeenAt: now,
        consumedAt: nextRemainingCredits === 0 ? now : activeQuota.consumedAt,
      })
      .where(eq(guestTrialQuota.id, activeQuota.id))
      .returning();

    return {
      quota: updatedQuota || activeQuota,
    };
  });
}

export async function refundGuestTrialCredits({
  token,
  credits,
}: {
  token: string;
  credits: number;
}) {
  const safeCredits = Math.max(1, Math.floor(credits));
  const tokenHash = toGuestTokenHash(token);
  const now = new Date();

  return db().transaction(async (tx: any) => {
    const quota = await getQuotaByTokenHash(tokenHash, tx);
    if (!quota) {
      return null;
    }

    const nextRemainingCredits = Math.min(
      getGuestTrialTotalCredits(),
      toInt(quota.remainingCredits) + safeCredits
    );
    const nextUsedTaskCount = Math.max(0, toInt(quota.usedTaskCount) - 1);
    const shouldClearConsumedAt =
      nextRemainingCredits >= getGuestTrialTotalCredits() &&
      nextUsedTaskCount === 0;

    const [updatedQuota] = await tx
      .update(guestTrialQuota)
      .set({
        remainingCredits: nextRemainingCredits,
        usedTaskCount: nextUsedTaskCount,
        lastSeenAt: now,
        consumedAt: shouldClearConsumedAt ? null : quota.consumedAt,
      })
      .where(eq(guestTrialQuota.id, quota.id))
      .returning();

    return updatedQuota || quota;
  });
}

export async function linkGuestTaskToToken({
  token,
  taskId,
}: {
  token: string;
  taskId: string;
}) {
  const tokenHash = toGuestTokenHash(token);
  const now = new Date();

  return db().transaction(async (tx: any) => {
    const quota = await getQuotaByTokenHash(tokenHash, tx);
    if (!quota) {
      throw new Error('guest trial unavailable, please sign in');
    }

    await tx
      .insert(guestTrialTask)
      .values({
        id: getUuid(),
        quotaId: quota.id,
        taskId,
        createdAt: now,
      })
      .onConflictDoNothing();

    await tx
      .update(guestTrialQuota)
      .set({ lastSeenAt: now })
      .where(eq(guestTrialQuota.id, quota.id));
  });
}

export async function canGuestAccessTask({
  token,
  taskId,
}: {
  token: string;
  taskId: string;
}) {
  const tokenHash = toGuestTokenHash(token);
  const [row] = await db()
    .select({ id: guestTrialTask.id })
    .from(guestTrialTask)
    .innerJoin(guestTrialQuota, eq(guestTrialTask.quotaId, guestTrialQuota.id))
    .where(
      and(
        eq(guestTrialTask.taskId, taskId),
        eq(guestTrialQuota.tokenHash, tokenHash)
      )
    )
    .limit(1);

  return !!row?.id;
}

export async function getGuestVideoTasksByToken({
  token,
  page,
  limit,
}: {
  token: string;
  page: number;
  limit: number;
}) {
  const tokenHash = toGuestTokenHash(token);
  const condition = and(
    eq(guestTrialQuota.tokenHash, tokenHash),
    eq(aiTask.mediaType, AIMediaType.VIDEO)
  );

  const [totalRow] = await db()
    .select({ count: count() })
    .from(guestTrialTask)
    .innerJoin(guestTrialQuota, eq(guestTrialTask.quotaId, guestTrialQuota.id))
    .innerJoin(aiTask, eq(guestTrialTask.taskId, aiTask.id))
    .where(condition);

  const items = await db()
    .select({ task: aiTask })
    .from(guestTrialTask)
    .innerJoin(guestTrialQuota, eq(guestTrialTask.quotaId, guestTrialQuota.id))
    .innerJoin(aiTask, eq(guestTrialTask.taskId, aiTask.id))
    .where(condition)
    .orderBy(desc(guestTrialTask.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return {
    total: toInt(totalRow?.count),
    items: items.map((row: { task: typeof aiTask.$inferSelect }) => row.task),
  };
}
