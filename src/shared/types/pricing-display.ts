export type PricingDisplayCardKey =
  | 'monthly-free'
  | 'monthly-standard'
  | 'monthly-premium'
  | 'monthly-unlimited'
  | 'yearly-free'
  | 'yearly-standard'
  | 'yearly-premium'
  | 'yearly-unlimited';

export type PricingDisplayCycle = 'monthly' | 'yearly';
export type PricingDisplayTier = 'free' | 'standard' | 'premium' | 'unlimited';
export type PricingDisplayFeatureTone =
  | 'positive'
  | 'negative'
  | 'neutral'
  | 'accent';
export type PricingDisplayFeatureIcon = 'check' | 'x' | 'dot';
export type PricingDisplayCtaMode = 'checkout' | 'contact' | 'disabled';

export type PricingDisplayFeature = {
  text: string;
  icon: PricingDisplayFeatureIcon;
  tone: PricingDisplayFeatureTone;
};

export type PricingDisplayPlan = {
  cardKey: PricingDisplayCardKey;
  cycle: PricingDisplayCycle;
  tier: PricingDisplayTier;
  title: string;
  priceLabel: string;
  originalPriceLabel?: string;
  unitLabel?: string;
  badgeLabel?: string;
  ctaLabel: string;
  ctaMode: PricingDisplayCtaMode;
  productId?: string;
  features: PricingDisplayFeature[];
};

export type PricingDisplayCreditPack = {
  productId: string;
  title: string;
  creditsLabel: string;
  priceLabel: string;
  ctaLabel: string;
};

export type PricingDisplayCopy = {
  monthlyLabel: string;
  yearlyLabel: string;
  yearlyDiscountLabel: string;
  currentLabel: string;
  choosePlanLabel: string;
  contactUsLabel: string;
  creditPackTitle: string;
  creditPackDescription: string;
  subscriptionNoticeLabel: string;
  copiedEmailToast: string;
  signInRequiredToast: string;
  creditsRequiredToast: string;
  creditPackLockedToast: string;
  currentPlanToast: string;
};

export type PricingDisplayCatalog = {
  copy: PricingDisplayCopy;
  currentPlanCard: PricingDisplayCardKey;
  recommendedPlanCard: PricingDisplayCardKey;
  defaultCycle: PricingDisplayCycle;
  isAuthenticated: boolean;
  hasPaidSubscription: boolean;
  canPurchaseCreditPack: boolean;
  supportEmail: string;
  subscriptions: Record<PricingDisplayCycle, PricingDisplayPlan[]>;
  creditPacks: PricingDisplayCreditPack[];
};
