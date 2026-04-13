'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Check,
  Coins,
  Loader2,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useLocale } from 'next-intl';
import { toast } from 'sonner';

import { signIn } from '@/core/auth/client';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { useAppContext } from '@/shared/contexts/app';
import { cn } from '@/shared/lib/utils';
import type { Pricing as PricingSection } from '@/shared/types/blocks/pricing';
import type {
  PricingDisplayCardKey,
  PricingDisplayCatalog,
  PricingDisplayCreditPack,
  PricingDisplayCycle,
  PricingDisplayFeature,
  PricingDisplayPlan,
} from '@/shared/types/pricing-display';

type PricingProps = {
  section: PricingSection & {
    data?: {
      pricingCatalog?: PricingDisplayCatalog;
    };
  };
  className?: string;
  pricingCatalog?: PricingDisplayCatalog;
};

function isFreeCard(cardKey: PricingDisplayCardKey) {
  return cardKey === 'monthly-free' || cardKey === 'yearly-free';
}

function featureToneClass(
  tone: PricingDisplayFeature['tone'],
  isHighlighted: boolean
) {
  if (tone === 'negative') {
    return 'text-rose-500 dark:text-rose-300';
  }
  if (tone === 'accent') {
    return isHighlighted
      ? 'text-emerald-300 dark:text-emerald-300'
      : 'text-emerald-700 dark:text-emerald-300';
  }
  if (tone === 'neutral') {
    return 'text-zinc-600 dark:text-zinc-400';
  }
  return isHighlighted
    ? 'text-zinc-100 dark:text-zinc-100'
    : 'text-zinc-800 dark:text-zinc-200';
}

function tierGlowClass(tier: PricingDisplayPlan['tier']) {
  if (tier === 'free') {
    return 'shadow-[0_24px_64px_-38px_rgba(16,185,129,0.45)]';
  }
  if (tier === 'standard') {
    return 'shadow-[0_24px_64px_-38px_rgba(56,189,248,0.45)]';
  }
  if (tier === 'premium') {
    return 'shadow-[0_24px_64px_-38px_rgba(168,85,247,0.42)]';
  }
  return 'shadow-[0_24px_64px_-38px_rgba(245,158,11,0.42)]';
}

function tierAccentClass(tier: PricingDisplayPlan['tier']) {
  if (tier === 'free') {
    return 'text-emerald-500 dark:text-emerald-300';
  }
  if (tier === 'standard') {
    return 'text-sky-500 dark:text-sky-300';
  }
  if (tier === 'premium') {
    return 'text-violet-500 dark:text-violet-300';
  }
  return 'text-amber-500 dark:text-amber-300';
}

function FeatureIcon({
  feature,
  highlighted,
}: {
  feature: PricingDisplayFeature;
  highlighted: boolean;
}) {
  if (feature.icon === 'x') {
    return (
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rose-400/30 bg-rose-500/10 text-rose-500 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-300">
        <X className="h-3.5 w-3.5" />
      </span>
    );
  }

  if (feature.icon === 'dot') {
    return (
      <span
        className={cn(
          'mt-2 h-1.5 w-1.5 shrink-0 rounded-full',
          highlighted ? 'bg-emerald-300' : 'bg-zinc-400 dark:bg-zinc-500'
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
        highlighted
          ? 'border-emerald-400/25 bg-emerald-300/10 text-emerald-300'
          : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/15 dark:bg-emerald-400/10 dark:text-emerald-300'
      )}
    >
      <Check className="h-3.5 w-3.5" />
    </span>
  );
}

function PlanCard({
  plan,
  copy,
  isCurrent,
  isEmphasized,
  isRecommended,
  isLoading,
  onAction,
}: {
  plan: PricingDisplayPlan;
  copy: PricingDisplayCatalog['copy'];
  isCurrent: boolean;
  isEmphasized: boolean;
  isRecommended: boolean;
  isLoading: boolean;
  onAction: (plan: PricingDisplayPlan) => void;
}) {
  const highlighted = isEmphasized;

  return (
    <article
      className={cn(
        'relative flex h-full min-h-[640px] flex-col overflow-hidden rounded-[30px] border px-6 py-6 transition-all duration-200',
        highlighted
          ? cn(
              'border-emerald-400/45 bg-zinc-950 text-white ring-1 ring-emerald-300/25',
              tierGlowClass(plan.tier)
            )
          : isRecommended
            ? cn(
                'border-violet-300/28 bg-white/90 text-zinc-950 dark:border-violet-400/18 dark:bg-zinc-950/72 dark:text-white',
                tierGlowClass(plan.tier)
              )
            : 'border-zinc-200/80 bg-white/88 text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950/62 dark:text-white'
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-px opacity-80',
          highlighted
            ? 'bg-gradient-to-r from-transparent via-emerald-300 to-transparent'
            : 'bg-gradient-to-r from-transparent via-zinc-200 to-transparent dark:via-zinc-700'
        )}
      />

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p
            className={cn(
              'text-[28px] font-semibold tracking-tight',
              highlighted ? 'text-white' : tierAccentClass(plan.tier)
            )}
          >
            {plan.title}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRecommended && !isCurrent ? (
            <Badge className="rounded-full bg-violet-500/12 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-violet-600 uppercase dark:bg-violet-400/12 dark:text-violet-200">
              {plan.badgeLabel}
            </Badge>
          ) : null}
          {isCurrent ? (
            <Badge className="rounded-full bg-emerald-500/14 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-emerald-200 uppercase dark:bg-emerald-400/12 dark:text-emerald-200">
              {copy.currentLabel}
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="mb-6 flex min-h-[92px] flex-col justify-end">
        {plan.originalPriceLabel ? (
          <div className="mb-1 flex items-end gap-2">
            <span className="text-sm font-medium text-zinc-400 line-through decoration-zinc-400/70">
              {plan.originalPriceLabel}
            </span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-2">
          <span className="text-5xl font-semibold tracking-tight">
            {plan.priceLabel}
          </span>
          {plan.unitLabel ? (
            <span
              className={cn(
                'pb-1 text-sm font-medium',
                highlighted ? 'text-zinc-300' : 'text-zinc-500 dark:text-zinc-400'
              )}
            >
              {plan.unitLabel}
            </span>
          ) : null}
        </div>
      </div>

      <Button
        type="button"
        onClick={() => onAction(plan)}
        disabled={isLoading || isCurrent || plan.ctaMode === 'disabled'}
        className={cn(
          'mb-6 h-12 rounded-full text-sm font-semibold shadow-none transition',
          plan.ctaMode === 'contact'
            ? 'border border-zinc-300 bg-zinc-100 text-zinc-700 hover:border-zinc-400 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800'
            : highlighted
              ? 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300'
              : 'bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200',
          isCurrent || plan.ctaMode === 'disabled'
            ? 'cursor-not-allowed bg-zinc-200 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800'
            : '',
          isLoading ? 'cursor-wait' : ''
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {plan.ctaLabel}
          </>
        ) : isCurrent ? (
          copy.currentLabel
        ) : (
          plan.ctaLabel
        )}
      </Button>

      <div className="mb-5 h-px bg-gradient-to-r from-transparent via-zinc-300/70 to-transparent dark:via-zinc-700/70" />

      <div className="space-y-3">
        {plan.features.map((feature) => (
          <div key={`${plan.cardKey}-${feature.text}`} className="flex gap-3">
            <FeatureIcon feature={feature} highlighted={highlighted} />
            <p
              className={cn(
                'text-sm leading-6',
                featureToneClass(feature.tone, highlighted)
              )}
            >
              {feature.text}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function CreditPackCard({
  pack,
  isLoading,
  onPurchase,
}: {
  pack: PricingDisplayCreditPack;
  isLoading: boolean;
  onPurchase: (pack: PricingDisplayCreditPack) => void;
}) {
  return (
    <article className="relative overflow-hidden rounded-[28px] border border-emerald-500/12 bg-[linear-gradient(135deg,rgba(16,185,129,0.12),rgba(15,23,42,0.08)_48%,rgba(20,184,166,0.18))] p-6 shadow-[0_24px_70px_-42px_rgba(16,185,129,0.45)] dark:border-emerald-400/10 dark:bg-[linear-gradient(135deg,rgba(16,185,129,0.15),rgba(20,20,20,0.82)_55%,rgba(20,184,166,0.18))]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" />
      <div className="mb-3 flex items-center justify-center gap-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
        <Zap className="h-5 w-5 text-amber-400" />
        <span>{pack.creditsLabel}</span>
      </div>
      <p className="mb-6 text-center text-lg font-medium text-zinc-700 dark:text-zinc-300">
        {pack.priceLabel}
      </p>
      <Button
        type="button"
        onClick={() => onPurchase(pack)}
        disabled={isLoading}
        className="h-12 w-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-400 to-green-300 text-zinc-950 hover:from-emerald-300 hover:via-teal-300 hover:to-lime-300"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {pack.ctaLabel}
          </>
        ) : (
          pack.ctaLabel
        )}
      </Button>
    </article>
  );
}

export function Pricing({ section, className, pricingCatalog }: PricingProps) {
  const locale = useLocale();
  const searchParams = useSearchParams();
  const { configs, fetchUserCredits, fetchUserInfo, isCheckSign, user } =
    useAppContext();

  const catalog = pricingCatalog ?? section.data?.pricingCatalog;
  const plansRef = useRef<HTMLDivElement>(null);
  const handledNoticeRef = useRef<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<PricingDisplayCycle>(
    catalog?.defaultCycle ?? 'monthly'
  );
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const scrollToPlans = useCallback(() => {
    plansRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  useEffect(() => {
    if (!catalog) return;
    setSelectedCycle(catalog.defaultCycle);
  }, [catalog]);

  useEffect(() => {
    if (!catalog) return;

    const notice = searchParams?.get('notice') || '';
    const focus = searchParams?.get('focus') || '';
    const key = `${notice}|${focus}`;

    if (!notice || handledNoticeRef.current === key) {
      return;
    }

    handledNoticeRef.current = key;

    if (focus === 'plans' || focus === 'subscriptions') {
      window.setTimeout(() => {
        scrollToPlans();
      }, 80);
    }

    if (notice === 'credits-required' || notice === 'subscription-required') {
      toast.success(catalog.copy.creditsRequiredToast, {
        position: 'bottom-right',
      });
    }
  }, [catalog, scrollToPlans, searchParams]);

  const triggerGoogleSignIn = useCallback(async () => {
    const callbackURL =
      `${window.location.pathname}${window.location.search}${window.location.hash}` ||
      '/';

    try {
      await signIn.social({
        provider: 'google',
        callbackURL,
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('pricing google sign in failed:', error);
      }
      window.location.assign('/sign-in');
    }
  }, []);

  const startCheckout = useCallback(
    async (productId: string) => {
      if (!catalog) {
        return;
      }

      const paymentProvider = configs.default_payment_provider || '';

      setLoadingKey(productId);
      try {
        const response = await fetch('/api/payment/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product_id: productId,
            currency: 'usd',
            locale,
            payment_provider: paymentProvider,
          }),
        });

        if (!response.ok) {
          throw new Error(`request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as {
          code: number;
          message?: string;
          data?: {
            checkoutUrl?: string;
          };
        };

        if (payload.code !== 0) {
          const message = payload.message || 'checkout failed';
          const normalized = message.toLowerCase();

          if (
            normalized.includes('no auth') ||
            normalized.includes('sign in')
          ) {
            await triggerGoogleSignIn();
            return;
          }

          if (normalized.includes('already have this plan active')) {
            toast.success(catalog.copy.currentPlanToast, {
              position: 'bottom-right',
            });
            await fetchUserInfo();
            await fetchUserCredits();
            return;
          }

          if (normalized.includes('active subscription required')) {
            toast.success(catalog.copy.creditPackLockedToast, {
              position: 'bottom-right',
            });
            scrollToPlans();
            return;
          }

          throw new Error(message);
        }

        const checkoutUrl = payload.data?.checkoutUrl;
        if (!checkoutUrl) {
          throw new Error('checkout url not found');
        }

        window.location.href = checkoutUrl;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'checkout failed';
        toast.error(message, {
          position: 'bottom-right',
        });
      } finally {
        setLoadingKey(null);
      }
    },
    [
      catalog,
      configs.default_payment_provider,
      fetchUserCredits,
      fetchUserInfo,
      locale,
      scrollToPlans,
      triggerGoogleSignIn,
    ]
  );

  const handlePlanAction = useCallback(
    async (plan: PricingDisplayPlan) => {
      if (!catalog) {
        return;
      }

      const isCurrent =
        (!catalog.hasPaidSubscription && plan.tier === 'free') ||
        catalog.currentPlanCard === plan.cardKey;

      if (isCurrent || plan.ctaMode === 'disabled') {
        return;
      }

      if (!user && !isCheckSign) {
        await triggerGoogleSignIn();
        return;
      }

      if (plan.ctaMode === 'contact') {
        try {
          await navigator.clipboard.writeText(catalog.supportEmail);
          toast.success(catalog.copy.copiedEmailToast, {
            position: 'bottom-right',
          });
        } catch {
          window.location.href = `mailto:${catalog.supportEmail}`;
        }
        return;
      }

      if (!plan.productId) {
        return;
      }

      await startCheckout(plan.productId);
    },
    [catalog, isCheckSign, startCheckout, triggerGoogleSignIn, user]
  );

  const handleCreditPackPurchase = useCallback(
    async (pack: PricingDisplayCreditPack) => {
      if (!catalog) {
        return;
      }

      if (!user && !isCheckSign) {
        await triggerGoogleSignIn();
        return;
      }

      if (!catalog.canPurchaseCreditPack) {
        toast.success(catalog.copy.creditPackLockedToast, {
          position: 'bottom-right',
        });
        scrollToPlans();
        return;
      }

      await startCheckout(pack.productId);
    },
    [
      catalog,
      isCheckSign,
      scrollToPlans,
      startCheckout,
      triggerGoogleSignIn,
      user,
    ]
  );

  const visiblePlans = useMemo(
    () => catalog?.subscriptions[selectedCycle] ?? [],
    [catalog, selectedCycle]
  );

  if (!catalog) {
    return null;
  }

  return (
    <section
      id={section.id}
      className={cn(
        'relative overflow-hidden px-4 py-16 sm:px-6 lg:px-8',
        className
      )}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          {section.title ? (
            <h1 className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
              {section.title}
            </h1>
          ) : null}
          {section.description ? (
            <p className="text-foreground/70 mx-auto mt-4 max-w-3xl text-base leading-7 sm:text-lg">
              {section.description}
            </p>
          ) : null}
        </div>

        <div
          ref={plansRef}
          className="relative overflow-hidden rounded-[36px] border border-zinc-200/80 bg-white/70 p-4 shadow-[0_34px_100px_-60px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/66"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.08),transparent_28%)] dark:bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.14),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.14),transparent_28%)]" />

          <div className="relative mb-8 flex flex-col items-center gap-4 pt-3">
            <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-100/85 p-1 dark:border-zinc-800 dark:bg-zinc-900/85">
              <button
                type="button"
                onClick={() => setSelectedCycle('monthly')}
                className={cn(
                  'rounded-full px-5 py-2 text-sm font-semibold transition',
                  selectedCycle === 'monthly'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-100 dark:text-zinc-950'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                )}
              >
                {catalog.copy.monthlyLabel}
              </button>
              <button
                type="button"
                onClick={() => setSelectedCycle('yearly')}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition',
                  selectedCycle === 'yearly'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-100 dark:text-zinc-950'
                    : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                )}
              >
                <span>{catalog.copy.yearlyLabel}</span>
                <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-bold tracking-[0.12em] text-zinc-950 uppercase">
                  {catalog.copy.yearlyDiscountLabel}
                </span>
              </button>
            </div>

          </div>

          <div className="relative grid gap-5 lg:grid-cols-4">
            {visiblePlans.map((plan) => {
              const isCurrent =
                (!catalog.hasPaidSubscription && plan.tier === 'free') ||
                catalog.currentPlanCard === plan.cardKey;
              const isEmphasized = catalog.hasPaidSubscription
                ? catalog.currentPlanCard === plan.cardKey
                : plan.cardKey === catalog.recommendedPlanCard;
              const isRecommended = plan.cardKey === catalog.recommendedPlanCard;

              return (
                <PlanCard
                  key={plan.cardKey}
                  plan={plan}
                  copy={catalog.copy}
                  isCurrent={isCurrent}
                  isEmphasized={isEmphasized}
                  isRecommended={isRecommended}
                  isLoading={loadingKey === (plan.productId || plan.cardKey)}
                  onAction={handlePlanAction}
                />
              );
            })}
          </div>

          <div className="relative mt-12 rounded-[32px] border border-zinc-200/70 bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-950/72">
            <div className="mb-8 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-emerald-600 uppercase dark:border-emerald-400/15 dark:bg-emerald-400/8 dark:text-emerald-200">
                <Coins className="h-3.5 w-3.5" />
                {catalog.copy.creditPackTitle}
              </div>
              <h2 className="text-foreground text-3xl font-semibold tracking-tight">
                {catalog.copy.creditPackTitle}
              </h2>
              <p className="text-foreground/68 mx-auto mt-3 max-w-3xl text-base leading-7">
                {catalog.copy.creditPackDescription}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {catalog.creditPacks.map((pack) => (
                <CreditPackCard
                  key={pack.productId}
                  pack={pack}
                  isLoading={loadingKey === pack.productId}
                  onPurchase={handleCreditPackPurchase}
                />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-500/20 bg-emerald-500/6 px-4 py-3 text-center text-sm text-emerald-700 dark:border-emerald-400/16 dark:bg-emerald-400/8 dark:text-emerald-200">
              <Sparkles className="h-4 w-4" />
              <span>{catalog.copy.subscriptionNoticeLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
