import { cookies } from 'next/headers';

import { getUuid } from '@/shared/lib/hash';
import { getClientIp } from '@/shared/lib/ip';
import { respData, respErr } from '@/shared/lib/resp';
import {
  ensureGuestTrialSession,
  GUEST_DEVICE_ID_COOKIE,
  GUEST_TRIAL_COOKIE_MAX_AGE_SECONDS,
  GUEST_TRIAL_TOKEN_COOKIE,
} from '@/shared/models/guest_trial';
import { getUserInfo } from '@/shared/models/user';

async function getGuestIdentity() {
  const cookieStore = await cookies();
  let token = cookieStore.get(GUEST_TRIAL_TOKEN_COOKIE)?.value?.trim() || '';
  let deviceId = cookieStore.get(GUEST_DEVICE_ID_COOKIE)?.value?.trim() || '';

  const secure = process.env.NODE_ENV === 'production';

  if (!token) {
    token = getUuid();
    cookieStore.set({
      name: GUEST_TRIAL_TOKEN_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: GUEST_TRIAL_COOKIE_MAX_AGE_SECONDS,
    });
  }

  if (!deviceId) {
    deviceId = getUuid();
    cookieStore.set({
      name: GUEST_DEVICE_ID_COOKIE,
      value: deviceId,
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: GUEST_TRIAL_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return { token, deviceId };
}

export async function POST(request: Request) {
  try {
    const user = await getUserInfo();
    if (user) {
      return respErr('already signed in');
    }

    const guestIdentity = await getGuestIdentity();
    const ip = await getClientIp();
    const result = await ensureGuestTrialSession({
      token: guestIdentity.token,
      deviceId: guestIdentity.deviceId,
      ip,
      userAgent: request.headers.get('user-agent') || '',
      acceptLanguage: request.headers.get('accept-language') || '',
    });

    return respData(result);
  } catch (error: any) {
    console.error('get guest trial credits failed:', error);
    return respErr(error?.message || 'get guest trial credits failed');
  }
}
