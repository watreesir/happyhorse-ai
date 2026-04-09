import { respData, respErr } from '@/shared/lib/resp';
import { claimDailyCreditsForUser } from '@/shared/models/credit';
import { getUserInfo } from '@/shared/models/user';

export async function POST() {
  try {
    const user = await getUserInfo();
    if (!user) {
      return respErr('no auth, please sign in');
    }

    const result = await claimDailyCreditsForUser(user);
    return respData(result);
  } catch (e) {
    console.log('claim daily credits failed:', e);
    return respErr('claim daily credits failed');
  }
}
