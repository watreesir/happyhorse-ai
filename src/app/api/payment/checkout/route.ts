import {
  PaymentInterval,
  PaymentOrder,
  PaymentPrice,
  PaymentType,
} from '@/extensions/payment/types';
import { getSnowId, getUuid } from '@/shared/lib/hash';
import { respData, respErr } from '@/shared/lib/resp';
import { getAllConfigs } from '@/shared/models/config';
import {
  createOrder,
  NewOrder,
  OrderStatus,
  updateOrderByOrderNo,
} from '@/shared/models/order';
import { getUserInfo } from '@/shared/models/user';
import { getPaymentService } from '@/shared/services/payment';
import {
  getCheckoutCurrency,
  getCreditPackByProductId,
  getPricingSnapshot,
  getSubscriptionPlanByProductId,
  isCreditPackProductId,
  isSubscriptionPlanProductId,
} from '@/shared/services/pricing';

type CheckoutRequestPayload = {
  product_id?: string;
  currency?: string;
  locale?: string;
  payment_provider?: string;
  metadata?: Record<string, string>;
};

const STRIPE_PRICE_ID_FALLBACKS: Record<string, string> = {
  plan_standard_monthly:
    process.env.STRIPE_PRICE_PLAN_STANDARD_MONTHLY ||
    'price_1TLUynLXVz3sZh2WPm5sTqpg',
  plan_premium_monthly:
    process.env.STRIPE_PRICE_PLAN_PREMIUM_MONTHLY ||
    'price_1TLUzqLXVz3sZh2WcMVeR9v8',
  plan_standard_yearly:
    process.env.STRIPE_PRICE_PLAN_STANDARD_YEARLY ||
    'price_1TLV1LLXVz3sZh2WmxASQIYo',
  plan_premium_yearly:
    process.env.STRIPE_PRICE_PLAN_PREMIUM_YEARLY ||
    'price_1TLV2fLXVz3sZh2WbMRhpxju',
  credit_pack_starter:
    process.env.STRIPE_PRICE_CREDIT_PACK_STARTER ||
    'price_1TLV4XLXVz3sZh2WHNeAdc9Z',
  credit_pack_standard:
    process.env.STRIPE_PRICE_CREDIT_PACK_STANDARD ||
    'price_1TLV5bLXVz3sZh2Wg2FFdfjL',
  credit_pack_premium:
    process.env.STRIPE_PRICE_CREDIT_PACK_PREMIUM ||
    'price_1TLV6VLXVz3sZh2Wws20DLSD',
};

export async function POST(req: Request) {
  try {
    const { product_id, currency, locale, payment_provider, metadata } =
      (await req.json()) as CheckoutRequestPayload;

    if (!product_id) {
      return respErr('product_id is required');
    }

    const subscriptionPlan = getSubscriptionPlanByProductId(product_id);
    const creditPack = getCreditPackByProductId(product_id);

    if (!subscriptionPlan && !creditPack) {
      return respErr('pricing item not found');
    }

    const checkoutCurrency = getCheckoutCurrency();
    if (currency && currency.toLowerCase() !== checkoutCurrency) {
      return respErr('unsupported currency');
    }

    const user = await getUserInfo();
    if (!user || !user.email) {
      return respErr('no auth, please sign in');
    }

    const pricingSnapshot = await getPricingSnapshot(user.id);
    if (
      isSubscriptionPlanProductId(product_id) &&
      pricingSnapshot.validSubscriptionProductIds.includes(product_id)
    ) {
      return respErr('you already have this plan active');
    }

    if (
      isCreditPackProductId(product_id) &&
      !pricingSnapshot.canPurchaseCreditPack
    ) {
      return respErr('active subscription required before buying credit packs');
    }

    const configs = await getAllConfigs();

    let paymentProviderName = payment_provider || configs.default_payment_provider;
    if (!paymentProviderName) {
      return respErr('no payment provider configured');
    }

    const paymentService = await getPaymentService();
    const paymentProvider = paymentService.getProvider(paymentProviderName);
    if (!paymentProvider || !paymentProvider.name) {
      return respErr('no payment provider configured');
    }

    const amountCents = subscriptionPlan
      ? subscriptionPlan.amountCents
      : creditPack!.amountCents;
    const paymentInterval = subscriptionPlan
      ? subscriptionPlan.interval
      : PaymentInterval.ONE_TIME;
    const paymentType = subscriptionPlan
      ? PaymentType.SUBSCRIPTION
      : PaymentType.ONE_TIME;
    const productName = subscriptionPlan
      ? subscriptionPlan.productName
      : creditPack!.productName;
    const planName = subscriptionPlan?.planName || '';
    const creditsAmount = subscriptionPlan
      ? subscriptionPlan.monthlyCredits
      : creditPack!.credits;
    const creditsValidDays = subscriptionPlan
      ? subscriptionPlan.validDays
      : creditPack!.validDays;

    const orderNo = getSnowId();
    let callbackBaseUrl = `${configs.app_url}`;
    if (locale && locale !== configs.default_locale) {
      callbackBaseUrl += `/${locale}`;
    }

    const callbackUrl = callbackBaseUrl;

    const checkoutPrice: PaymentPrice = {
      amount: amountCents,
      currency: checkoutCurrency,
    };

    const promotionCode = await getPromotionCode(
      product_id,
      paymentProviderName,
      checkoutCurrency
    );

    const checkoutOrder: PaymentOrder = {
      description: productName,
      customer: {
        name: user.name,
        email: user.email,
      },
      type: paymentType,
      metadata: {
        app_name: configs.app_name,
        order_no: orderNo,
        user_id: user.id,
        product_id,
        ...(metadata || {}),
      },
      successUrl: `${configs.app_url}/api/payment/callback?order_no=${orderNo}`,
      cancelUrl: `${callbackBaseUrl}/pricing`,
      price: checkoutPrice,
    };

    if (subscriptionPlan) {
      checkoutOrder.plan = {
        interval: paymentInterval,
        name: productName,
      };
    }

    const paymentProductId = await getPaymentProductId(
      product_id,
      paymentProviderName,
      checkoutCurrency
    );
    if (paymentProductId) {
      checkoutOrder.productId = paymentProductId.trim();
    }

    if (promotionCode) {
      checkoutOrder.discount = {
        code: promotionCode,
      };
    }

    const currentTime = new Date();
    const order: NewOrder = {
      id: getUuid(),
      orderNo,
      userId: user.id,
      userEmail: user.email,
      status: OrderStatus.PENDING,
      amount: amountCents,
      currency: checkoutCurrency,
      productId: product_id,
      paymentType,
      paymentInterval,
      paymentProvider: paymentProvider.name,
      checkoutInfo: JSON.stringify(checkoutOrder),
      createdAt: currentTime,
      productName,
      description: productName,
      callbackUrl,
      creditsAmount,
      creditsValidDays,
      planName,
      paymentProductId: paymentProductId || '',
      discountCode: promotionCode,
    };

    await createOrder(order);

    try {
      const result = await paymentProvider.createPayment({
        order: checkoutOrder,
      });

      await updateOrderByOrderNo(orderNo, {
        status: OrderStatus.CREATED,
        checkoutInfo: JSON.stringify(result.checkoutParams),
        checkoutResult: JSON.stringify(result.checkoutResult),
        checkoutUrl: result.checkoutInfo.checkoutUrl,
        paymentSessionId: result.checkoutInfo.sessionId,
        paymentProvider: result.provider,
      });

      return respData(result.checkoutInfo);
    } catch (e: any) {
      await updateOrderByOrderNo(orderNo, {
        status: OrderStatus.COMPLETED,
        checkoutInfo: JSON.stringify(checkoutOrder),
      });

      return respErr('checkout failed: ' + e.message);
    }
  } catch (e: any) {
    console.log('checkout failed:', e);
    return respErr('checkout failed: ' + e.message);
  }
}

async function getPaymentProductId(
  productId: string,
  provider: string,
  checkoutCurrency: string
) {
  if (provider === 'stripe') {
    return STRIPE_PRICE_ID_FALLBACKS[productId];
  }

  if (provider !== 'creem') {
    return;
  }

  try {
    const configs = await getAllConfigs();
    const creemProductIds = configs.creem_product_ids;
    if (creemProductIds) {
      const productIds = JSON.parse(creemProductIds);
      return (
        productIds[`${productId}_${checkoutCurrency}`] || productIds[productId]
      );
    }
  } catch (e: any) {
    console.log('get payment product id failed:', e);
    return;
  }
}

async function getPromotionCode(
  productId: string,
  provider: string,
  checkoutCurrency: string
) {
  if (provider !== 'stripe') {
    return;
  }

  try {
    const configs = await getAllConfigs();
    const stripePromotionCodes = configs.stripe_promotion_codes;
    if (stripePromotionCodes) {
      const promotionCodes = JSON.parse(stripePromotionCodes);
      return (
        promotionCodes[`${productId}_${checkoutCurrency}`] ||
        promotionCodes[productId]
      );
    }
  } catch (e: any) {
    console.log('get promotion code failed:', e);
    return;
  }
}
