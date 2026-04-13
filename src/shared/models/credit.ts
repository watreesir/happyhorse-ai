import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  isNull,
  like,
  or,
  sum,
} from 'drizzle-orm';

import { db } from '@/core/db';
import { credit, user as userTable } from '@/config/db/schema';
import {
  DAILY_LOGIN_BONUS_CREDITS,
  DAILY_LOGIN_BONUS_DESCRIPTION,
  DAILY_LOGIN_BONUS_METADATA_TYPE,
  DAILY_LOGIN_BONUS_TIMEZONE,
} from '@/shared/lib/credits';
import { getSnowId, getUuid } from '@/shared/lib/hash';
import {
  getFreeDailyCreditsAmount,
  getFreeDailyVideoLimit,
  getPricingSnapshot,
} from '@/shared/services/pricing';

import { getAllConfigs } from './config';
import { appendUserToResult, User } from './user';

export type Credit = typeof credit.$inferSelect & {
  user?: User;
};
export type NewCredit = typeof credit.$inferInsert;
export type UpdateCredit = Partial<
  Omit<NewCredit, 'id' | 'transactionNo' | 'createdAt'>
>;

export enum CreditStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  DELETED = 'deleted',
}

export enum CreditTransactionType {
  GRANT = 'grant', // grant credit
  CONSUME = 'consume', // consume credit
}

export enum CreditTransactionScene {
  PAYMENT = 'payment', // payment
  SUBSCRIPTION = 'subscription', // subscription
  RENEWAL = 'renewal', // renewal
  GIFT = 'gift', // gift
  REWARD = 'reward', // reward
}

export type DailyCreditClaimResult = {
  claimed: boolean;
  alreadyClaimed: boolean;
  credits: number;
  dayKey: string;
  eligible: boolean;
  reason?: 'already-claimed' | 'not-eligible' | 'disabled';
};

type DailyCreditUser = {
  id: string;
  email?: string | null;
};

function getDateKeyByTimeZone(
  date: Date = new Date(),
  timeZone: string = DAILY_LOGIN_BONUS_TIMEZONE
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function getDatePartsByTimeZone(
  date: Date = new Date(),
  timeZone: string = DAILY_LOGIN_BONUS_TIMEZONE
) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value || '0');

  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second'),
  };
}

function getTimeZoneOffsetMs(
  date: Date = new Date(),
  timeZone: string = DAILY_LOGIN_BONUS_TIMEZONE
) {
  const parts = getDatePartsByTimeZone(date, timeZone);
  const utcTimestamp = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );
  const actualTimestamp = Math.floor(date.getTime() / 1000) * 1000;

  return utcTimestamp - actualTimestamp;
}

function zonedDateTimeToUtcDate({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  timeZone = DAILY_LOGIN_BONUS_TIMEZONE,
}: {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  timeZone?: string;
}) {
  const utcGuess = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second)
  );
  const offset = getTimeZoneOffsetMs(utcGuess, timeZone);

  return new Date(utcGuess.getTime() - offset);
}

function getEndOfDayByTimeZone(
  date: Date = new Date(),
  timeZone: string = DAILY_LOGIN_BONUS_TIMEZONE
) {
  const parts = getDatePartsByTimeZone(date, timeZone);
  const nextMidnight = zonedDateTimeToUtcDate({
    year: parts.year,
    month: parts.month,
    day: parts.day + 1,
    hour: 0,
    minute: 0,
    second: 0,
    timeZone,
  });

  return new Date(nextMidnight.getTime() - 1);
}

// Calculate credit expiration time based on order and subscription info
export function calculateCreditExpirationTime({
  creditsValidDays,
  currentPeriodEnd,
}: {
  creditsValidDays: number;
  currentPeriodEnd?: Date;
}): Date | null {
  const now = new Date();

  // Check if credits should never expire
  if (!creditsValidDays || creditsValidDays <= 0) {
    // never expires
    return null;
  }

  const expiresAt = new Date();

  if (currentPeriodEnd) {
    // For subscription: credits expire at the end of current period
    expiresAt.setTime(currentPeriodEnd.getTime());
  } else {
    // For one-time payment: use configured validity days
    expiresAt.setDate(now.getDate() + creditsValidDays);
  }

  return expiresAt;
}

// Helper function to create expiration condition for queries
export function createExpirationCondition() {
  const currentTime = new Date();
  // Credit is valid if: expires_at IS NULL OR expires_at > current_time
  return or(isNull(credit.expiresAt), gt(credit.expiresAt, currentTime));
}

// create credit
export async function createCredit(newCredit: NewCredit) {
  const [result] = await db().insert(credit).values(newCredit).returning();
  return result;
}

// get credits
export async function getCredits({
  userId,
  status,
  transactionType,
  getUser = false,
  page = 1,
  limit = 30,
}: {
  userId?: string;
  status?: CreditStatus;
  transactionType?: CreditTransactionType;
  getUser?: boolean;
  page?: number;
  limit?: number;
}): Promise<Credit[]> {
  const result = await db()
    .select()
    .from(credit)
    .where(
      and(
        userId ? eq(credit.userId, userId) : undefined,
        status ? eq(credit.status, status) : undefined,
        transactionType
          ? eq(credit.transactionType, transactionType)
          : undefined
      )
    )
    .orderBy(desc(credit.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  if (getUser) {
    return appendUserToResult(result);
  }

  return result;
}

// get credits count
export async function getCreditsCount({
  userId,
  status,
  transactionType,
}: {
  userId?: string;
  status?: CreditStatus;
  transactionType?: CreditTransactionType;
}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(credit)
    .where(
      and(
        userId ? eq(credit.userId, userId) : undefined,
        status ? eq(credit.status, status) : undefined,
        transactionType
          ? eq(credit.transactionType, transactionType)
          : undefined
      )
    );

  return result?.count || 0;
}

// consume credits
export async function consumeCredits({
  userId,
  credits,
  scene,
  description,
  metadata,
  tx,
}: {
  userId: string;
  credits: number; // credits to consume
  scene?: string;
  description?: string;
  metadata?: string;
  tx?: any;
}) {
  const currentTime = new Date();

  // consume credits
  const execute = async (tx: any) => {
    // 1. check credits balance
    const [creditsBalance] = await tx
      .select({
        total: sum(credit.remainingCredits),
      })
      .from(credit)
      .where(
        and(
          eq(credit.userId, userId),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.status, CreditStatus.ACTIVE),
          gt(credit.remainingCredits, 0),
          or(
            isNull(credit.expiresAt), // Never expires
            gt(credit.expiresAt, currentTime) // Not yet expired
          )
        )
      );

    // balance is not enough
    if (
      !creditsBalance ||
      !creditsBalance.total ||
      parseInt(creditsBalance.total) < credits
    ) {
      throw new Error(
        `Insufficient credits, ${creditsBalance?.total || 0} < ${credits}`
      );
    }

    // 2. get available credits, FIFO queue with expiresAt, batch query
    let remainingToConsume = credits; // remaining credits to consume

    // only deal with 10000 credit grant records
    let batchNo = 1; // batch no
    const maxBatchNo = 10; // max batch no
    const batchSize = 1000; // batch size
    const consumedItems: any[] = [];

    while (remainingToConsume > 0) {
      // get batch credits
      const batchCredits = await tx
        .select()
        .from(credit)
        .where(
          and(
            eq(credit.userId, userId),
            eq(credit.transactionType, CreditTransactionType.GRANT),
            eq(credit.status, CreditStatus.ACTIVE),
            gt(credit.remainingCredits, 0),
            or(
              isNull(credit.expiresAt), // Never expires
              gt(credit.expiresAt, currentTime) // Not yet expired
            )
          )
        )
        .orderBy(
          // FIFO queue: expired credits first, then by expiration date
          // NULL values (never expires) will be ordered last
          asc(credit.expiresAt)
        )
        .limit(batchSize) // batch size
        .offset((batchNo - 1) * batchSize) // offset
        .for('update'); // lock for update

      // no more credits
      if (batchCredits?.length === 0) {
        break;
      }

      // consume credits for each item
      for (const item of batchCredits) {
        // no need to consume more
        if (remainingToConsume <= 0) {
          break;
        }
        const toConsume = Math.min(remainingToConsume, item.remainingCredits);

        // update remaining credits
        await tx
          .update(credit)
          .set({ remainingCredits: item.remainingCredits - toConsume })
          .where(eq(credit.id, item.id));

        // update consumed items
        consumedItems.push({
          creditId: item.id,
          transactionNo: item.transactionNo,
          expiresAt: item.expiresAt,
          creditsToConsume: remainingToConsume,
          creditsConsumed: toConsume,
          creditsBefore: item.remainingCredits,
          creditsAfter: item.remainingCredits - toConsume,
          batchSize: batchSize,
          batchNo: batchNo,
        });

        batchNo += 1;
        remainingToConsume -= toConsume;

        // if too many batches, throw error
        if (batchNo > maxBatchNo) {
          throw new Error(`Too many batches: ${batchNo} > ${maxBatchNo}`);
        }
      }
    }

    // 3. create consumed credit
    const consumedCredit: NewCredit = {
      id: getUuid(),
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.CONSUME,
      transactionScene: scene,
      userId: userId,
      status: CreditStatus.ACTIVE,
      description: description,
      credits: -credits,
      consumedDetail: JSON.stringify(consumedItems),
      metadata: metadata,
    };
    await tx.insert(credit).values(consumedCredit);

    return consumedCredit;
  };

  // use provided transaction
  if (tx) {
    return await execute(tx);
  }

  // use default transaction
  return await db().transaction(execute);
}

// get remaining credits
export async function getRemainingCredits(userId: string): Promise<number> {
  const currentTime = new Date();

  const [result] = await db()
    .select({
      total: sum(credit.remainingCredits),
    })
    .from(credit)
    .where(
      and(
        eq(credit.userId, userId),
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.status, CreditStatus.ACTIVE),
        gt(credit.remainingCredits, 0),
        or(
          isNull(credit.expiresAt), // Never expires
          gt(credit.expiresAt, currentTime) // Not yet expired
        )
      )
    );

  return parseInt(result?.total || '0');
}

// grant credits for new user
export async function grantCreditsForNewUser(user: User) {
  // get configs from db
  const configs = await getAllConfigs();

  // if initial credits enabled
  if (configs.initial_credits_enabled !== 'true') {
    return;
  }

  // get initial credits amount and valid days
  let credits = parseInt(configs.initial_credits_amount as string) || 0;
  if (credits <= 0) {
    return;
  }

  const creditsValidDays =
    parseInt(configs.initial_credits_valid_days as string) || 0;

  const description = configs.initial_credits_description || 'initial credits';

  const newCredit = await grantCreditsForUser({
    user: user,
    credits: credits,
    validDays: creditsValidDays,
    description: description,
  });

  return newCredit;
}

export async function claimDailyCreditsForUser(
  user: DailyCreditUser
): Promise<DailyCreditClaimResult> {
  const credits = getFreeDailyCreditsAmount();
  const dayKey = getDateKeyByTimeZone();

  if (credits <= 0) {
    return {
      claimed: false,
      alreadyClaimed: false,
      credits: 0,
      dayKey,
      eligible: false,
      reason: 'disabled',
    };
  }

  const pricingSnapshot = await getPricingSnapshot(user.id);
  if (!pricingSnapshot.freeDailyEligible) {
    return {
      claimed: false,
      alreadyClaimed: false,
      credits: 0,
      dayKey,
      eligible: false,
      reason: 'not-eligible',
    };
  }

  return db().transaction(async (tx: any) => {
    await tx
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.id, user.id))
      .limit(1)
      .for('update');

    const [existingDailyReward] = await tx
      .select({ id: credit.id })
      .from(credit)
      .where(
        and(
          eq(credit.userId, user.id),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.transactionScene, CreditTransactionScene.REWARD),
          like(
            credit.metadata,
            `%\"type\":\"${DAILY_LOGIN_BONUS_METADATA_TYPE}\"%`
          ),
          like(credit.metadata, `%\"dayKey\":\"${dayKey}\"%`)
        )
      )
      .limit(1);

    if (existingDailyReward) {
      return {
        claimed: false,
        alreadyClaimed: true,
        credits,
        dayKey,
        eligible: true,
        reason: 'already-claimed',
      };
    }

    const metadata = JSON.stringify({
      type: DAILY_LOGIN_BONUS_METADATA_TYPE,
      dayKey,
      timezone: DAILY_LOGIN_BONUS_TIMEZONE,
    });

    const newCredit: NewCredit = {
      id: getUuid(),
      userId: user.id,
      userEmail: user.email || null,
      orderNo: '',
      subscriptionNo: '',
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.GRANT,
      transactionScene: CreditTransactionScene.REWARD,
      credits,
      remainingCredits: credits,
      description: DAILY_LOGIN_BONUS_DESCRIPTION,
      expiresAt: getEndOfDayByTimeZone(),
      status: CreditStatus.ACTIVE,
      metadata,
    };

    await tx.insert(credit).values(newCredit);

    return {
      claimed: true,
      alreadyClaimed: false,
      credits,
      dayKey,
      eligible: true,
    };
  });
}

const FREE_DAILY_VIDEO_USAGE_METADATA_TYPE = 'free-daily-video-usage';

export async function reserveFreeDailyVideoUsageForUser({
  user,
  dayKey = getDateKeyByTimeZone(),
}: {
  user: DailyCreditUser;
  dayKey?: string;
}) {
  const videoLimit = getFreeDailyVideoLimit();
  if (videoLimit <= 0) {
    return { reserved: false, markerId: null as string | null };
  }

  return db().transaction(async (tx: any) => {
    await tx
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.id, user.id))
      .limit(1)
      .for('update');

    const existingUsages = await tx
      .select({ id: credit.id })
      .from(credit)
      .where(
        and(
          eq(credit.userId, user.id),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          eq(credit.transactionScene, CreditTransactionScene.REWARD),
          eq(credit.status, CreditStatus.ACTIVE),
          like(
            credit.metadata,
            `%\"type\":\"${FREE_DAILY_VIDEO_USAGE_METADATA_TYPE}\"%`
          ),
          like(credit.metadata, `%\"dayKey\":\"${dayKey}\"%`)
        )
      )
      .limit(videoLimit);

    if (existingUsages.length >= videoLimit) {
      return { reserved: false, markerId: null as string | null };
    }

    const newCredit: NewCredit = {
      id: getUuid(),
      userId: user.id,
      userEmail: user.email || null,
      orderNo: '',
      subscriptionNo: '',
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.GRANT,
      transactionScene: CreditTransactionScene.REWARD,
      credits: 0,
      remainingCredits: 0,
      description: 'free daily video usage',
      expiresAt: getEndOfDayByTimeZone(),
      status: CreditStatus.ACTIVE,
      metadata: JSON.stringify({
        type: FREE_DAILY_VIDEO_USAGE_METADATA_TYPE,
        dayKey,
        timezone: DAILY_LOGIN_BONUS_TIMEZONE,
      }),
    };

    await tx.insert(credit).values(newCredit);

    return {
      reserved: true,
      markerId: newCredit.id,
    };
  });
}

export async function attachFreeDailyVideoUsageMarkerToTask({
  markerId,
  taskId,
}: {
  markerId: string;
  taskId: string;
}) {
  if (!markerId || !taskId) {
    return null;
  }

  const [marker] = await db()
    .select({ id: credit.id, metadata: credit.metadata })
    .from(credit)
    .where(eq(credit.id, markerId))
    .limit(1);

  if (!marker?.id) {
    return null;
  }

  let metadata: Record<string, any> = {};
  try {
    metadata = marker.metadata ? JSON.parse(marker.metadata) : {};
  } catch {
    metadata = {};
  }

  metadata.taskId = taskId;

  const [result] = await db()
    .update(credit)
    .set({
      metadata: JSON.stringify(metadata),
    })
    .where(eq(credit.id, markerId))
    .returning();

  return result || null;
}

export async function releaseFreeDailyVideoUsageForUser(markerId: string) {
  if (!markerId) {
    return null;
  }

  const [result] = await db()
    .update(credit)
    .set({
      status: CreditStatus.DELETED,
      deletedAt: new Date(),
    })
    .where(eq(credit.id, markerId))
    .returning();

  return result;
}

export async function releaseFreeDailyVideoUsageForTask({
  taskId,
  tx,
}: {
  taskId: string;
  tx?: any;
}) {
  if (!taskId) {
    return null;
  }

  const executor = tx || db();
  const [result] = await executor
    .update(credit)
    .set({
      status: CreditStatus.DELETED,
      deletedAt: new Date(),
    })
    .where(
      and(
        eq(credit.transactionType, CreditTransactionType.GRANT),
        eq(credit.transactionScene, CreditTransactionScene.REWARD),
        eq(credit.status, CreditStatus.ACTIVE),
        like(
          credit.metadata,
          `%\"type\":\"${FREE_DAILY_VIDEO_USAGE_METADATA_TYPE}\"%`
        ),
        like(credit.metadata, `%\"taskId\":\"${taskId}\"%`)
      )
    )
    .returning();

  return result || null;
}

// grant credits for user
export async function grantCreditsForUser({
  user,
  credits,
  validDays,
  description,
}: {
  user: User;
  credits: number;
  validDays?: number;
  description?: string;
}) {
  if (credits <= 0) {
    return;
  }

  const creditsValidDays = validDays && validDays > 0 ? validDays : 0;

  const expiresAt = calculateCreditExpirationTime({
    creditsValidDays: creditsValidDays,
  });

  const creditDescription = description || 'grant credits';

  const newCredit: NewCredit = {
    id: getUuid(),
    userId: user.id,
    userEmail: user.email,
    orderNo: '',
    subscriptionNo: '',
    transactionNo: getSnowId(),
    transactionType: CreditTransactionType.GRANT,
    transactionScene: CreditTransactionScene.GIFT,
    credits: credits,
    remainingCredits: credits,
    description: creditDescription,
    expiresAt: expiresAt,
    status: CreditStatus.ACTIVE,
  };

  await createCredit(newCredit);

  return newCredit;
}
