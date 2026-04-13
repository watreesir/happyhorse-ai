import { and, desc, eq, gt, inArray, isNull, like, or } from 'drizzle-orm';

import { db } from '@/core/db';
import { subscription as subscriptionTable, credit as creditTable } from '@/config/db/schema';
import { PaymentInterval } from '@/extensions/payment/types';

export type PricingPlanTier = 'free' | 'standard' | 'premium' | 'unlimited';
export type PricingBillingCycle = 'monthly' | 'yearly';
export type SubscriptionProductId =
  | 'plan_standard_monthly'
  | 'plan_premium_monthly'
  | 'plan_standard_yearly'
  | 'plan_premium_yearly';
export type CreditPackProductId =
  | 'credit_pack_starter'
  | 'credit_pack_standard'
  | 'credit_pack_premium';
export type PricingProductId = SubscriptionProductId | CreditPackProductId;
export type CurrentPlanCardKey =
  | 'monthly-free'
  | 'monthly-standard'
  | 'monthly-premium'
  | 'monthly-unlimited'
  | 'yearly-free'
  | 'yearly-standard'
  | 'yearly-premium'
  | 'yearly-unlimited';

export type SubscriptionPlanConfig = {
  productId: SubscriptionProductId;
  tier: Exclude<PricingPlanTier, 'free' | 'unlimited'>;
  cycle: PricingBillingCycle;
  interval: PaymentInterval;
  amountCents: number;
  originalAmountCents?: number;
  displayAmountCents?: number;
  displayOriginalAmountCents?: number;
  monthlyCredits: number;
  monthlyGrantMode: 'provider-cycle' | 'anchored-monthly';
  validDays: number;
  productName: string;
  planName: string;
};

export type CreditPackConfig = {
  productId: CreditPackProductId;
  tier: 'starter' | 'standard' | 'premium';
  amountCents: number;
  credits: number;
  validDays: number;
  productName: string;
};

export type PricingSnapshot = {
  validSubscriptionProductIds: SubscriptionProductId[];
  currentSubscriptionProductId: SubscriptionProductId | null;
  currentPlanCard: CurrentPlanCardKey;
  hasPaidSubscription: boolean;
  hasActivePurchasedCredits: boolean;
  canPurchaseCreditPack: boolean;
  freeDailyEligible: boolean;
};

export type SubscriptionGrantWindow = {
  grantStart: Date;
  grantEnd: Date;
  grantKey: string;
};

const ACTIVE_SUBSCRIPTION_STATUSES = [
  'active',
  'pending_cancel',
  'trialing',
] as const;
const CREDIT_STATUS_ACTIVE = 'active';
const CREDIT_TRANSACTION_TYPE_GRANT = 'grant';
const CREDIT_TRANSACTION_SCENE_PAYMENT = 'payment';
const CREDIT_TRANSACTION_SCENE_REWARD = 'reward';

const USD = 'usd';
const DEFAULT_SUPPORT_EMAIL =
  process.env.PRICING_SUPPORT_EMAIL?.trim() || 'support@happyhorse-ai.app';

function parsePositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseDecimalToCents(value: string | undefined, fallback: number) {
  const raw = String(value ?? '').trim();
  if (!raw) return Math.round(fallback * 100);
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return Math.round(fallback * 100);
  }
  return Math.round(parsed * 100);
}

function getNow() {
  return new Date();
}

export function getSupportContactEmail() {
  return DEFAULT_SUPPORT_EMAIL;
}

export function getFreeDailyCreditsAmount() {
  return parsePositiveInt(process.env.FREE_DAILY_CREDITS, 65);
}

export function getFreeDailyVideoLimit() {
  return parsePositiveInt(process.env.FREE_DAILY_VIDEO_LIMIT, 1);
}

export function getVideoCreditRatePerSecond(resolution: '720p' | '1080p') {
  if (resolution === '1080p') {
    return parsePositiveInt(process.env.AI_VIDEO_1080P_CREDITS_PER_SECOND, 2);
  }
  return parsePositiveInt(process.env.AI_VIDEO_720P_CREDITS_PER_SECOND, 1);
}

export function calculateVideoCreditsCost({
  resolution,
  durationSeconds,
}: {
  resolution: '720p' | '1080p';
  durationSeconds: number;
}) {
  const safeDuration = Math.max(1, Math.ceil(durationSeconds || 0));
  return getVideoCreditRatePerSecond(resolution) * safeDuration;
}

export function getSubscriptionPlanConfigs(): SubscriptionPlanConfig[] {
  return [
    {
      productId: 'plan_standard_monthly',
      tier: 'standard',
      cycle: 'monthly',
      interval: PaymentInterval.MONTH,
      amountCents: parseDecimalToCents(
        process.env.PRICING_MONTHLY_STANDARD_PRICE_USD,
        10
      ),
      monthlyCredits: parsePositiveInt(
        process.env.PRICING_MONTHLY_STANDARD_CREDITS,
        800
      ),
      monthlyGrantMode: 'provider-cycle',
      validDays: 31,
      productName: 'Happy Horse AI Standard Monthly',
      planName: 'Standard',
    },
    {
      productId: 'plan_premium_monthly',
      tier: 'premium',
      cycle: 'monthly',
      interval: PaymentInterval.MONTH,
      amountCents: parseDecimalToCents(
        process.env.PRICING_MONTHLY_PREMIUM_PRICE_USD,
        20
      ),
      monthlyCredits: parsePositiveInt(
        process.env.PRICING_MONTHLY_PREMIUM_CREDITS,
        2000
      ),
      monthlyGrantMode: 'provider-cycle',
      validDays: 31,
      productName: 'Happy Horse AI Premium Monthly',
      planName: 'Premium',
    },
    {
      productId: 'plan_standard_yearly',
      tier: 'standard',
      cycle: 'yearly',
      interval: PaymentInterval.YEAR,
      amountCents: parseDecimalToCents(
        process.env.PRICING_YEARLY_STANDARD_BILLED_PRICE_USD ||
          process.env.PRICING_YEARLY_STANDARD_ANNUAL_PRICE_USD,
        94.8
      ),
      displayAmountCents: parseDecimalToCents(
        process.env.PRICING_YEARLY_STANDARD_PRICE_USD,
        7.9
      ),
      displayOriginalAmountCents: parseDecimalToCents(
        process.env.PRICING_MONTHLY_STANDARD_PRICE_USD,
        10
      ),
      monthlyCredits: parsePositiveInt(
        process.env.PRICING_YEARLY_STANDARD_MONTHLY_CREDITS,
        800
      ),
      monthlyGrantMode: 'anchored-monthly',
      validDays: 32,
      productName: 'Happy Horse AI Standard Yearly',
      planName: 'Standard',
    },
    {
      productId: 'plan_premium_yearly',
      tier: 'premium',
      cycle: 'yearly',
      interval: PaymentInterval.YEAR,
      amountCents: parseDecimalToCents(
        process.env.PRICING_YEARLY_PREMIUM_BILLED_PRICE_USD ||
          process.env.PRICING_YEARLY_PREMIUM_ANNUAL_PRICE_USD,
        190.8
      ),
      displayAmountCents: parseDecimalToCents(
        process.env.PRICING_YEARLY_PREMIUM_PRICE_USD,
        15.9
      ),
      displayOriginalAmountCents: parseDecimalToCents(
        process.env.PRICING_MONTHLY_PREMIUM_PRICE_USD,
        20
      ),
      monthlyCredits: parsePositiveInt(
        process.env.PRICING_YEARLY_PREMIUM_MONTHLY_CREDITS,
        2000
      ),
      monthlyGrantMode: 'anchored-monthly',
      validDays: 32,
      productName: 'Happy Horse AI Premium Yearly',
      planName: 'Premium',
    },
  ];
}

export function getCreditPackConfigs(): CreditPackConfig[] {
  return [
    {
      productId: 'credit_pack_starter',
      tier: 'starter',
      amountCents: parseDecimalToCents(
        process.env.PRICING_CREDIT_PACK_STARTER_PRICE_USD,
        29.9
      ),
      credits: parsePositiveInt(
        process.env.PRICING_CREDIT_PACK_STARTER_CREDITS,
        3000
      ),
      validDays: parsePositiveInt(
        process.env.PRICING_CREDIT_PACK_VALID_DAYS,
        365
      ),
      productName: 'Happy Horse AI Credit Pack Starter',
    },
    {
      productId: 'credit_pack_standard',
      tier: 'standard',
      amountCents: parseDecimalToCents(
        process.env.PRICING_CREDIT_PACK_STANDARD_PRICE_USD,
        99.9
      ),
      credits: parsePositiveInt(
        process.env.PRICING_CREDIT_PACK_STANDARD_CREDITS,
        12000
      ),
      validDays: parsePositiveInt(
        process.env.PRICING_CREDIT_PACK_VALID_DAYS,
        365
      ),
      productName: 'Happy Horse AI Credit Pack Standard',
    },
    {
      productId: 'credit_pack_premium',
      tier: 'premium',
      amountCents: parseDecimalToCents(
        process.env.PRICING_CREDIT_PACK_PREMIUM_PRICE_USD,
        299.9
      ),
      credits: parsePositiveInt(
        process.env.PRICING_CREDIT_PACK_PREMIUM_CREDITS,
        40000
      ),
      validDays: parsePositiveInt(
        process.env.PRICING_CREDIT_PACK_VALID_DAYS,
        365
      ),
      productName: 'Happy Horse AI Credit Pack Premium',
    },
  ];
}

export function getSubscriptionPlanByProductId(productId: string | null | undefined) {
  return getSubscriptionPlanConfigs().find((item) => item.productId === productId);
}

export function getCreditPackByProductId(productId: string | null | undefined) {
  return getCreditPackConfigs().find((item) => item.productId === productId);
}

export function isSubscriptionPlanProductId(
  productId: string | null | undefined
): productId is SubscriptionProductId {
  return !!getSubscriptionPlanByProductId(productId);
}

export function isCreditPackProductId(
  productId: string | null | undefined
): productId is CreditPackProductId {
  return !!getCreditPackByProductId(productId);
}

export function getCheckoutCurrency() {
  return USD;
}

export function addMonths(date: Date, count: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + count);
  return next;
}

export function getAnchoredMonthlyGrantWindow({
  currentPeriodStart,
  currentPeriodEnd,
  now = new Date(),
}: {
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  now?: Date;
}): SubscriptionGrantWindow {
  let grantStart = new Date(currentPeriodStart);
  const periodEnd = new Date(currentPeriodEnd);

  while (true) {
    const nextGrantStart = addMonths(grantStart, 1);
    if (nextGrantStart > now || nextGrantStart >= periodEnd) {
      const grantEnd =
        nextGrantStart < periodEnd ? nextGrantStart : new Date(periodEnd);
      return {
        grantStart,
        grantEnd,
        grantKey: grantStart.toISOString(),
      };
    }
    grantStart = nextGrantStart;
  }
}

export function mapProductIdToCurrentPlanCard(
  productId: string | null | undefined
): CurrentPlanCardKey {
  switch (productId) {
    case 'plan_standard_monthly':
      return 'monthly-standard';
    case 'plan_premium_monthly':
      return 'monthly-premium';
    case 'plan_standard_yearly':
      return 'yearly-standard';
    case 'plan_premium_yearly':
      return 'yearly-premium';
    default:
      return 'monthly-free';
  }
}

export async function getValidSubscriptionRows(userId: string) {
  const now = getNow();

  return db()
    .select()
    .from(subscriptionTable)
    .where(
      and(
        eq(subscriptionTable.userId, userId),
        inArray(subscriptionTable.status, [...ACTIVE_SUBSCRIPTION_STATUSES]),
        or(
          isNull(subscriptionTable.currentPeriodEnd),
          gt(subscriptionTable.currentPeriodEnd, now)
        )
      )
    )
    .orderBy(desc(subscriptionTable.createdAt));
}

export async function hasActivePurchasedCredits(userId: string) {
  const now = getNow();
  const [result] = await db()
    .select({ id: creditTable.id })
    .from(creditTable)
    .where(
      and(
        eq(creditTable.userId, userId),
        eq(creditTable.transactionType, CREDIT_TRANSACTION_TYPE_GRANT),
        eq(creditTable.transactionScene, CREDIT_TRANSACTION_SCENE_PAYMENT),
        eq(creditTable.status, CREDIT_STATUS_ACTIVE),
        gt(creditTable.remainingCredits, 0),
        or(isNull(creditTable.expiresAt), gt(creditTable.expiresAt, now))
      )
    )
    .limit(1);

  return !!result?.id;
}

export async function hasClaimRecordForType({
  userId,
  type,
  fragment,
}: {
  userId: string;
  type: string;
  fragment?: string;
}) {
  const [row] = await db()
    .select({ id: creditTable.id })
    .from(creditTable)
    .where(
      and(
        eq(creditTable.userId, userId),
        eq(creditTable.transactionType, CREDIT_TRANSACTION_TYPE_GRANT),
        eq(creditTable.transactionScene, CREDIT_TRANSACTION_SCENE_REWARD),
        eq(creditTable.status, CREDIT_STATUS_ACTIVE),
        like(creditTable.metadata, `%\"type\":\"${type}\"%`),
        fragment ? like(creditTable.metadata, `%${fragment}%`) : undefined
      )
    )
    .limit(1);

  return !!row?.id;
}

export async function getPricingSnapshot(
  userId: string
): Promise<PricingSnapshot> {
  const validSubscriptions = await getValidSubscriptionRows(userId);
  const subscriptionProductIds = validSubscriptions
    .map((item: typeof subscriptionTable.$inferSelect) => item.productId)
    .filter(isSubscriptionPlanProductId);
  const currentSubscriptionProductId = subscriptionProductIds[0] || null;
  const hasPaidSubscription = subscriptionProductIds.length > 0;
  const hasPurchasedCredits = await hasActivePurchasedCredits(userId);

  return {
    validSubscriptionProductIds: subscriptionProductIds,
    currentSubscriptionProductId,
    currentPlanCard: currentSubscriptionProductId
      ? mapProductIdToCurrentPlanCard(currentSubscriptionProductId)
      : 'monthly-free',
    hasPaidSubscription,
    hasActivePurchasedCredits: hasPurchasedCredits,
    canPurchaseCreditPack: hasPaidSubscription,
    freeDailyEligible: !hasPaidSubscription && !hasPurchasedCredits,
  };
}
