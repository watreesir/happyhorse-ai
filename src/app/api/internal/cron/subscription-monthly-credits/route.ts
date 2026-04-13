import { CreditTransactionScene } from '@/shared/models/credit';
import { respData } from '@/shared/lib/resp';
import {
  getActiveAnchoredMonthlySubscriptions,
  grantAnchoredMonthlySubscriptionCreditsIfNeeded,
} from '@/shared/services/subscription-grants';

function isAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return false;
  }

  const authorization = request.headers.get('authorization') || '';
  return authorization === `Bearer ${cronSecret}`;
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return Response.json(
        { code: -1, message: 'unauthorized' },
        { status: 401 }
      );
    }

    const subscriptions = await getActiveAnchoredMonthlySubscriptions();

    let createdCount = 0;
    let skippedCount = 0;

    for (const subscription of subscriptions) {
      const result = await grantAnchoredMonthlySubscriptionCreditsIfNeeded({
        subscription,
        source: 'cron',
        transactionScene: CreditTransactionScene.RENEWAL,
      });

      if (result.created) {
        createdCount += 1;
      } else {
        skippedCount += 1;
      }
    }

    return respData({
      scanned: subscriptions.length,
      created: createdCount,
      skipped: skippedCount,
    });
  } catch (error: any) {
    console.log('subscription monthly credits cron failed:', error);
    return Response.json(
      {
        code: -1,
        message: error?.message || 'subscription monthly credits cron failed',
      },
      { status: 500 }
    );
  }
}
