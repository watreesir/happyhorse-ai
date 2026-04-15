import { respData, respErr } from '@/shared/lib/resp';
import {
  claimGuestVideoTasksForUser,
  getGuestTrialTokenFromRequest,
} from '@/shared/models/guest_trial';
import { getUserInfo } from '@/shared/models/user';

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const guestToken = getGuestTrialTokenFromRequest(request);
    if (!guestToken) {
      return respData({
        claimedCount: 0,
        taskIds: [],
      });
    }

    const result = await claimGuestVideoTasksForUser({
      token: guestToken,
      userId: user.id,
    });

    return respData(result);
  } catch (error: any) {
    console.error('claim guest tasks failed:', error);
    return respErr(error?.message || 'failed to claim guest tasks');
  }
}
