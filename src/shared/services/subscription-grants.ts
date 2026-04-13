import { and, eq, gt, inArray, isNull, like, or } from 'drizzle-orm';

import { db } from '@/core/db';
import { credit, subscription as subscriptionTable } from '@/config/db/schema';
import { getSnowId, getUuid } from '@/shared/lib/hash';
import {
  CreditStatus,
  CreditTransactionScene,
  CreditTransactionType,
  NewCredit,
} from '@/shared/models/credit';
import {
  Subscription,
  SubscriptionStatus,
} from '@/shared/models/subscription';

import {
  getAnchoredMonthlyGrantWindow,
  getSubscriptionPlanByProductId,
} from './pricing';

export const ANCHORED_MONTHLY_GRANT_METADATA_TYPE =
  'anchored-monthly-subscription-grant';

export function buildAnchoredMonthlyGrantMetadata({
  subscription,
  grantKey,
  source,
}: {
  subscription: Pick<Subscription, 'subscriptionNo' | 'productId' | 'planName'>;
  grantKey: string;
  source: string;
}) {
  return JSON.stringify({
    type: ANCHORED_MONTHLY_GRANT_METADATA_TYPE,
    subscriptionNo: subscription.subscriptionNo,
    productId: subscription.productId,
    planName: subscription.planName || '',
    grantKey,
    source,
  });
}

export async function grantAnchoredMonthlySubscriptionCreditsIfNeeded({
  subscription,
  orderNo = '',
  source,
  transactionScene = CreditTransactionScene.RENEWAL,
  currentPeriodStart,
  currentPeriodEnd,
  now = new Date(),
}: {
  subscription: Subscription;
  orderNo?: string;
  source: 'checkout' | 'renewal' | 'cron';
  transactionScene?: CreditTransactionScene;
  currentPeriodStart?: Date | null;
  currentPeriodEnd?: Date | null;
  now?: Date;
}) {
  const plan = getSubscriptionPlanByProductId(subscription.productId);
  if (!plan || plan.monthlyGrantMode !== 'anchored-monthly') {
    return { created: false, credit: null };
  }

  const periodStart = currentPeriodStart || subscription.currentPeriodStart;
  const periodEnd = currentPeriodEnd || subscription.currentPeriodEnd;

  if (!periodStart || !periodEnd) {
    throw new Error('subscription period is required for anchored monthly grant');
  }

  const grantWindow = getAnchoredMonthlyGrantWindow({
    currentPeriodStart: new Date(periodStart),
    currentPeriodEnd: new Date(periodEnd),
    now,
  });

  const metadata = buildAnchoredMonthlyGrantMetadata({
    subscription,
    grantKey: grantWindow.grantKey,
    source,
  });

  return db().transaction(async (tx: any) => {
    const [existingCredit] = await tx
      .select({ id: credit.id })
      .from(credit)
      .where(
        and(
          eq(credit.subscriptionNo, subscription.subscriptionNo),
          eq(credit.transactionType, CreditTransactionType.GRANT),
          like(
            credit.metadata,
            `%\"type\":\"${ANCHORED_MONTHLY_GRANT_METADATA_TYPE}\"%`
          ),
          like(credit.metadata, `%\"grantKey\":\"${grantWindow.grantKey}\"%`)
        )
      )
      .limit(1);

    if (existingCredit?.id) {
      return { created: false, credit: null };
    }

    const newCredit: NewCredit = {
      id: getUuid(),
      userId: subscription.userId,
      userEmail: subscription.userEmail,
      orderNo,
      subscriptionNo: subscription.subscriptionNo,
      transactionNo: getSnowId(),
      transactionType: CreditTransactionType.GRANT,
      transactionScene,
      credits: plan.monthlyCredits,
      remainingCredits: plan.monthlyCredits,
      description: `${subscription.planName || plan.planName} monthly credits`,
      expiresAt: grantWindow.grantEnd,
      status: CreditStatus.ACTIVE,
      metadata,
    };

    const [createdCredit] = await tx.insert(credit).values(newCredit).returning();

    return { created: true, credit: createdCredit || newCredit };
  });
}

export async function getActiveAnchoredMonthlySubscriptions(now = new Date()) {
  const yearlyProductIds = [
    'plan_standard_yearly',
    'plan_premium_yearly',
  ] as const;

  return db()
    .select()
    .from(subscriptionTable)
    .where(
      and(
        eq(subscriptionTable.interval, 'year'),
        inArray(subscriptionTable.productId, [...yearlyProductIds]),
        inArray(subscriptionTable.status, [
          SubscriptionStatus.ACTIVE,
          SubscriptionStatus.PENDING_CANCEL,
          SubscriptionStatus.TRIALING,
        ]),
        or(
          isNull(subscriptionTable.currentPeriodEnd),
          gt(subscriptionTable.currentPeriodEnd, now)
        )
      )
    );
}
