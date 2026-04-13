import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getThemePage } from '@/core/theme';
import { getMetadata } from '@/shared/lib/seo';
import { getCurrentSubscription } from '@/shared/models/subscription';
import { getUserInfo } from '@/shared/models/user';
import {
  getCreditPackConfigs,
  getPricingSnapshot,
  getSubscriptionPlanConfigs,
  getSupportContactEmail,
} from '@/shared/services/pricing';
import type {
  PricingDisplayCatalog,
  PricingDisplayCycle,
  PricingDisplayFeature,
  PricingDisplayPlan,
} from '@/shared/types/pricing-display';
import { DynamicPage } from '@/shared/types/blocks/landing';

export const revalidate = 3600;

export const generateMetadata = getMetadata({
  metadataKey: 'pages.pricing.metadata',
  canonicalUrl: '/pricing',
});

function formatUsd(cents: number) {
  const amount = cents / 100;
  const hasDecimal = Math.abs(amount % 1) > Number.EPSILON;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasDecimal ? 1 : 0,
    maximumFractionDigits: hasDecimal ? 1 : 0,
  }).format(amount);
}

function buildFeature(
  text: string,
  options?: {
    icon?: PricingDisplayFeature['icon'];
    tone?: PricingDisplayFeature['tone'];
  }
): PricingDisplayFeature {
  return {
    text,
    icon: options?.icon || 'check',
    tone: options?.tone || 'positive',
  };
}

function buildPricingCatalog({
  t,
  hasPaidSubscription,
  isAuthenticated,
  currentPlanCard,
  canPurchaseCreditPack,
}: {
  t: Awaited<ReturnType<typeof getTranslations>>;
  hasPaidSubscription: boolean;
  isAuthenticated: boolean;
  currentPlanCard: PricingDisplayCatalog['currentPlanCard'];
  canPurchaseCreditPack: boolean;
}): PricingDisplayCatalog {
  const subscriptionPlans = getSubscriptionPlanConfigs();
  const creditPackPlans = getCreditPackConfigs();
  const supportEmail = getSupportContactEmail();

  const findPlan = (productId: string) => {
    const plan = subscriptionPlans.find((item) => item.productId === productId);
    if (!plan) {
      throw new Error(`missing subscription pricing config: ${productId}`);
    }
    return plan;
  };

  const monthlyStandard = findPlan('plan_standard_monthly');
  const monthlyPremium = findPlan('plan_premium_monthly');
  const yearlyStandard = findPlan('plan_standard_yearly');
  const yearlyPremium = findPlan('plan_premium_yearly');

  const unitPerMonth = t('messages.units.per_month');
  const currentLabel = t('messages.actions.current');
  const choosePlanLabel = t('messages.actions.choose_plan');
  const contactUsLabel = t('messages.actions.contact_us');
  const buyCreditPackLabel = t('messages.actions.buy_credit_pack');
  const recommendedLabel = t('messages.badges.recommended');

  const freeFeatures = [
    buildFeature(
      t('messages.features.daily_credits', {
        count: t('messages.values.free_daily_credits'),
      }),
      { tone: 'accent' }
    ),
    buildFeature(
      t('messages.features.daily_videos', {
        count: t('messages.values.free_daily_videos'),
      }),
      { tone: 'positive' }
    ),
    buildFeature(t('messages.features.free_text_only'), {
      tone: 'neutral',
    }),
    buildFeature(t('messages.features.free_portrait_locked'), {
      icon: 'x',
      tone: 'negative',
    }),
  ];

  const monthlyStandardFeatures = [
    buildFeature(
      t('messages.features.monthly_credits', {
        count: monthlyStandard.monthlyCredits,
      }),
      { tone: 'accent' }
    ),
    buildFeature(
      t('messages.features.generated_videos', {
        count: t('messages.values.monthly_standard_videos'),
      })
    ),
    buildFeature(t('messages.features.portrait_enabled')),
    buildFeature(t('messages.features.unlock_credit_packs')),
    buildFeature(t('messages.features.queue_priority')),
    buildFeature(t('messages.features.unlimited_downloads')),
    buildFeature(t('messages.features.normal_support')),
    buildFeature(t('messages.features.model_upcoming'), {
      tone: 'accent',
    }),
  ];

  const monthlyPremiumFeatures = [
    buildFeature(
      t('messages.features.monthly_credits', {
        count: monthlyPremium.monthlyCredits,
      }),
      { tone: 'accent' }
    ),
    buildFeature(
      t('messages.features.generated_videos', {
        count: t('messages.values.monthly_premium_videos'),
      })
    ),
    buildFeature(t('messages.features.portrait_enabled')),
    buildFeature(t('messages.features.unlock_credit_packs')),
    buildFeature(t('messages.features.queue_priority')),
    buildFeature(t('messages.features.unlimited_downloads')),
    buildFeature(t('messages.features.capacity_boost'), {
      tone: 'accent',
    }),
    buildFeature(t('messages.features.normal_support')),
    buildFeature(t('messages.features.model_upcoming'), {
      tone: 'accent',
    }),
  ];

  const yearlyStandardFeatures = [
    buildFeature(
      t('messages.features.monthly_credits', {
        count: yearlyStandard.monthlyCredits,
      }),
      { tone: 'accent' }
    ),
    buildFeature(
      t('messages.features.generated_videos', {
        count: t('messages.values.yearly_standard_videos'),
      })
    ),
    buildFeature(t('messages.features.portrait_enabled')),
    buildFeature(t('messages.features.unlock_credit_packs')),
    buildFeature(t('messages.features.queue_priority')),
    buildFeature(t('messages.features.unlimited_downloads')),
    buildFeature(t('messages.features.dedicated_support')),
    buildFeature(t('messages.features.model_upcoming'), {
      tone: 'accent',
    }),
    buildFeature(t('messages.features.advanced_access'), {
      tone: 'accent',
    }),
  ];

  const yearlyPremiumFeatures = [
    buildFeature(
      t('messages.features.monthly_credits', {
        count: yearlyPremium.monthlyCredits,
      }),
      { tone: 'accent' }
    ),
    buildFeature(
      t('messages.features.generated_videos', {
        count: t('messages.values.yearly_premium_videos'),
      })
    ),
    buildFeature(t('messages.features.portrait_enabled')),
    buildFeature(t('messages.features.unlock_credit_packs')),
    buildFeature(t('messages.features.queue_priority')),
    buildFeature(t('messages.features.unlimited_downloads')),
    buildFeature(t('messages.features.capacity_boost'), {
      tone: 'accent',
    }),
    buildFeature(t('messages.features.dedicated_support')),
    buildFeature(t('messages.features.model_upcoming'), {
      tone: 'accent',
    }),
    buildFeature(t('messages.features.advanced_access'), {
      tone: 'accent',
    }),
  ];

  const unlimitedFeatures = [
    buildFeature(t('messages.features.unlimited_credits'), {
      tone: 'accent',
    }),
    buildFeature(t('messages.features.api_access'), {
      tone: 'accent',
    }),
    buildFeature(t('messages.features.unlimited_includes_all')),
  ];

  const currentCycle: PricingDisplayCycle = hasPaidSubscription
    ? currentPlanCard.startsWith('yearly')
      ? 'yearly'
      : 'monthly'
    : 'yearly';

  const buildPlan = ({
    cardKey,
    cycle,
    title,
    priceCents,
    originalPriceCents,
    ctaMode,
    productId,
    features,
    badgeLabel,
  }: {
    cardKey: PricingDisplayPlan['cardKey'];
    cycle: PricingDisplayPlan['cycle'];
    title: string;
    priceCents?: number;
    originalPriceCents?: number;
    ctaMode: PricingDisplayPlan['ctaMode'];
    productId?: string;
    features: PricingDisplayPlan['features'];
    badgeLabel?: string;
  }): PricingDisplayPlan => ({
    cardKey,
    cycle,
    tier: cardKey.endsWith('free')
      ? 'free'
      : cardKey.endsWith('standard')
        ? 'standard'
        : cardKey.endsWith('premium')
          ? 'premium'
          : 'unlimited',
    title,
    priceLabel:
      typeof priceCents === 'number' ? formatUsd(priceCents) : contactUsLabel,
    originalPriceLabel:
      typeof originalPriceCents === 'number'
        ? formatUsd(originalPriceCents)
        : undefined,
    unitLabel:
      typeof priceCents === 'number' && !cardKey.endsWith('free')
        ? unitPerMonth
        : undefined,
    badgeLabel,
    ctaLabel: ctaMode === 'contact' ? contactUsLabel : choosePlanLabel,
    ctaMode,
    productId,
    features,
  });

  return {
    copy: {
      monthlyLabel: t('messages.billing.monthly'),
      yearlyLabel: t('messages.billing.yearly'),
      yearlyDiscountLabel: t('messages.billing.yearly_discount'),
      currentLabel,
      choosePlanLabel,
      contactUsLabel,
      creditPackTitle: t('messages.credit_pack.title'),
      creditPackDescription: t('messages.credit_pack.description'),
      subscriptionNoticeLabel: t('messages.credit_pack.notice'),
      copiedEmailToast: t('messages.toasts.email_copied'),
      signInRequiredToast: t('messages.toasts.sign_in_required'),
      creditsRequiredToast: t('messages.toasts.credits_required'),
      creditPackLockedToast: t('messages.toasts.credit_pack_locked'),
      currentPlanToast: t('messages.toasts.current_plan'),
    },
    currentPlanCard,
    recommendedPlanCard: 'yearly-premium',
    defaultCycle: currentCycle,
    isAuthenticated,
    hasPaidSubscription,
    canPurchaseCreditPack,
    supportEmail,
    subscriptions: {
      monthly: [
        buildPlan({
          cardKey: 'monthly-free',
          cycle: 'monthly',
          title: t('messages.plans.free'),
          priceCents: 0,
          ctaMode: 'disabled',
          features: freeFeatures,
        }),
        buildPlan({
          cardKey: 'monthly-standard',
          cycle: 'monthly',
          title: t('messages.plans.standard'),
          priceCents: monthlyStandard.amountCents,
          ctaMode: 'checkout',
          productId: monthlyStandard.productId,
          features: monthlyStandardFeatures,
        }),
        buildPlan({
          cardKey: 'monthly-premium',
          cycle: 'monthly',
          title: t('messages.plans.premium'),
          priceCents: monthlyPremium.amountCents,
          ctaMode: 'checkout',
          productId: monthlyPremium.productId,
          features: monthlyPremiumFeatures,
        }),
        buildPlan({
          cardKey: 'monthly-unlimited',
          cycle: 'monthly',
          title: t('messages.plans.unlimited'),
          ctaMode: 'contact',
          features: unlimitedFeatures,
        }),
      ],
      yearly: [
        buildPlan({
          cardKey: 'yearly-free',
          cycle: 'yearly',
          title: t('messages.plans.free'),
          priceCents: 0,
          ctaMode: 'disabled',
          features: freeFeatures,
        }),
        buildPlan({
          cardKey: 'yearly-standard',
          cycle: 'yearly',
          title: t('messages.plans.standard'),
          priceCents: yearlyStandard.displayAmountCents ?? yearlyStandard.amountCents,
          originalPriceCents:
            yearlyStandard.displayOriginalAmountCents ??
            yearlyStandard.originalAmountCents,
          ctaMode: 'checkout',
          productId: yearlyStandard.productId,
          features: yearlyStandardFeatures,
        }),
        buildPlan({
          cardKey: 'yearly-premium',
          cycle: 'yearly',
          title: t('messages.plans.premium'),
          priceCents: yearlyPremium.displayAmountCents ?? yearlyPremium.amountCents,
          originalPriceCents:
            yearlyPremium.displayOriginalAmountCents ??
            yearlyPremium.originalAmountCents,
          ctaMode: 'checkout',
          productId: yearlyPremium.productId,
          features: yearlyPremiumFeatures,
          badgeLabel: recommendedLabel,
        }),
        buildPlan({
          cardKey: 'yearly-unlimited',
          cycle: 'yearly',
          title: t('messages.plans.unlimited'),
          ctaMode: 'contact',
          features: unlimitedFeatures,
        }),
      ],
    },
    creditPacks: creditPackPlans.map((item) => ({
      productId: item.productId,
      title: t(`messages.credit_pack.plans.${item.tier}.title`),
      creditsLabel: t('messages.credit_pack.plan_credits', {
        count: item.credits.toLocaleString('en-US'),
      }),
      priceLabel: formatUsd(item.amountCents),
      ctaLabel: buyCreditPackLabel,
    })),
  };
}

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  let currentSubscription;
  let hasPaidSubscription = false;
  let currentPlanCard: PricingDisplayCatalog['currentPlanCard'] = 'monthly-free';
  let canPurchaseCreditPack = false;
  let isAuthenticated = false;
  try {
    const user = await getUserInfo();
    if (user) {
      isAuthenticated = true;
      currentSubscription = await getCurrentSubscription(user.id);
      const snapshot = await getPricingSnapshot(user.id);
      hasPaidSubscription = snapshot.hasPaidSubscription;
      currentPlanCard = snapshot.currentPlanCard;
      canPurchaseCreditPack = snapshot.canPurchaseCreditPack;
    }
  } catch (error) {
    console.log('getting current subscription failed:', error);
  }

  const t = await getTranslations('pages.pricing');
  const pricingCatalog = buildPricingCatalog({
    t,
    hasPaidSubscription,
    isAuthenticated,
    currentPlanCard,
    canPurchaseCreditPack,
  });

  const page: DynamicPage = {
    title: t.raw('page.title'),
    sections: {
      pricing: {
        id: 'pricing',
        title: t.raw('page.sections.pricing.title'),
        description: t.raw('page.sections.pricing.description'),
        data: {
          currentSubscription,
          pricingCatalog,
        },
      },
    },
  };

  const Page = await getThemePage('dynamic-page');

  return <Page locale={locale} page={page} />;
}
