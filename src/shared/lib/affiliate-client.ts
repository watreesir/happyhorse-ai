const AFFONSO_PENDING_SIGNUP_KEY = 'affonso:pending-signup';
const AFFONSO_PENDING_SIGNUP_MAX_AGE_MS = 30 * 60 * 1000;
const AFFONSO_REPORTED_EMAIL_PREFIX = 'affonso:signup-reported:email:';
const AFFONSO_REPORTED_USER_PREFIX = 'affonso:signup-reported:user:';

type AffonsoSignupOptions = {
  email?: string | null;
  externalUserId?: string | null;
  name?: string | null;
};

function normalizeValue(value?: string | null) {
  const normalized = String(value ?? '').trim();
  return normalized || '';
}

function normalizeEmail(email?: string | null) {
  return normalizeValue(email).toLowerCase();
}

function getReportedKeys({
  email,
  externalUserId,
}: Pick<AffonsoSignupOptions, 'email' | 'externalUserId'>) {
  const keys: string[] = [];
  const normalizedEmail = normalizeEmail(email);
  const normalizedUserId = normalizeValue(externalUserId);

  if (normalizedEmail) {
    keys.push(`${AFFONSO_REPORTED_EMAIL_PREFIX}${normalizedEmail}`);
  }
  if (normalizedUserId) {
    keys.push(`${AFFONSO_REPORTED_USER_PREFIX}${normalizedUserId}`);
  }

  return keys;
}

export function markPendingAffonsoSignup() {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      AFFONSO_PENDING_SIGNUP_KEY,
      String(Date.now())
    );
  } catch {
    // ignore storage errors
  }
}

export function clearPendingAffonsoSignup() {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(AFFONSO_PENDING_SIGNUP_KEY);
  } catch {
    // ignore storage errors
  }
}

export function hasRecentPendingAffonsoSignup(
  maxAgeMs = AFFONSO_PENDING_SIGNUP_MAX_AGE_MS
) {
  if (typeof window === 'undefined') return false;

  try {
    const raw = window.sessionStorage.getItem(AFFONSO_PENDING_SIGNUP_KEY);
    const startedAt = raw ? Number(raw) : 0;

    if (!startedAt || Number.isNaN(startedAt)) {
      clearPendingAffonsoSignup();
      return false;
    }

    const isFresh = Date.now() - startedAt <= maxAgeMs;
    if (!isFresh) {
      clearPendingAffonsoSignup();
    }

    return isFresh;
  } catch {
    return false;
  }
}

export function reportAffonsoSignup({
  configs,
  email,
  externalUserId,
  name,
}: AffonsoSignupOptions & {
  configs: Record<string, string>;
}) {
  if (typeof window === 'undefined') return false;
  if (configs.affonso_enabled !== 'true') return false;

  const normalizedEmail = normalizeEmail(email);
  const normalizedUserId = normalizeValue(externalUserId);
  const normalizedName = normalizeValue(name);

  if (!normalizedEmail && !normalizedUserId) {
    return false;
  }

  const reportKeys = getReportedKeys({
    email: normalizedEmail,
    externalUserId: normalizedUserId,
  });

  try {
    if (
      reportKeys.length > 0 &&
      reportKeys.some((key) => window.localStorage.getItem(key) === '1')
    ) {
      return true;
    }
  } catch {
    // ignore storage errors and continue
  }

  const affonso = (window as any).Affonso;
  if (!affonso || typeof affonso.signup !== 'function') {
    return false;
  }

  if (normalizedUserId || normalizedName) {
    affonso.signup({
      email: normalizedEmail || undefined,
      externalUserId: normalizedUserId || undefined,
      name: normalizedName || undefined,
    });
  } else {
    affonso.signup(normalizedEmail);
  }

  try {
    reportKeys.forEach((key) => window.localStorage.setItem(key, '1'));
  } catch {
    // ignore storage errors
  }

  return true;
}
