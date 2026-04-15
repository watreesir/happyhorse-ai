'use client';

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { getAuthClient } from '@/core/auth/client';
import { envConfigs } from '@/config';
import { locales } from '@/config/locale';
import { markPendingAffonsoSignup } from '@/shared/lib/affiliate-client';
import { User } from '@/shared/models/user';

export interface ContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  guestCredits: number | null;
  isCheckSign: boolean;
  setIsCheckSign: (isCheckSign: boolean) => void;
  isShowSignModal: boolean;
  setIsShowSignModal: (show: boolean) => void;
  isShowPaymentModal: boolean;
  setIsShowPaymentModal: (show: boolean) => void;
  configs: Record<string, string>;
  fetchConfigs: () => Promise<void>;
  fetchUserCredits: () => Promise<void>;
  fetchGuestCredits: () => Promise<{
    remainingCredits: number;
    totalCredits: number;
    usedTaskCount: number;
    claimedDaily: boolean;
    dayKey: string;
  } | null>;
  claimGuestTasks: () => Promise<{
    claimedCount: number;
    taskIds: string[];
  } | null>;
  fetchUserInfo: () => Promise<void>;
  showOneTap: (configs: Record<string, string>) => Promise<void>;
}

const AppContext = createContext({} as ContextValue);

export const useAppContext = () => useContext(AppContext);

const ONE_TAP_AUTO_PROMPT_STORE_KEY = 'google-one-tap:auto-prompt-state';
const ONE_TAP_AUTO_PROMPT_WINDOW_MS = 24 * 60 * 60 * 1000;
const ONE_TAP_AUTO_PROMPT_LIMIT = 2;
const ONE_TAP_AUTO_PROMPT_DELAY_MS = 3_000;

type OneTapAutoPromptState = {
  windowStartAt: number;
  count: number;
};

type GuestTaskClaimResult = {
  claimedCount: number;
  taskIds: string[];
};

function normalizePathname(pathname: string) {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

function isOneTapAutoPromptPath(pathname: string) {
  const normalized = normalizePathname(pathname);
  if (normalized === '/' || normalized === '/ai-video-studio') {
    return true;
  }

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 1) {
    return locales.includes(segments[0]);
  }

  return (
    segments.length === 2 &&
    locales.includes(segments[0]) &&
    segments[1] === 'ai-video-studio'
  );
}

function readOneTapAutoPromptState(now: number): OneTapAutoPromptState {
  if (typeof window === 'undefined') {
    return { windowStartAt: now, count: 0 };
  }

  try {
    const raw = window.localStorage.getItem(ONE_TAP_AUTO_PROMPT_STORE_KEY);
    if (!raw) {
      return { windowStartAt: now, count: 0 };
    }

    const parsed = JSON.parse(raw) as Partial<OneTapAutoPromptState>;
    const windowStartAt = Number(parsed.windowStartAt) || now;
    const count = Number(parsed.count) || 0;

    if (now - windowStartAt >= ONE_TAP_AUTO_PROMPT_WINDOW_MS) {
      return { windowStartAt: now, count: 0 };
    }

    return {
      windowStartAt,
      count: Math.max(0, count),
    };
  } catch {
    return { windowStartAt: now, count: 0 };
  }
}

function writeOneTapAutoPromptState(state: OneTapAutoPromptState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      ONE_TAP_AUTO_PROMPT_STORE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // ignore storage errors
  }
}

function dispatchGuestTaskClaimRefresh() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('video-studio:refresh', {
      detail: { reason: 'submit' },
    })
  );
}

export const AppContextProvider = ({ children }: { children: ReactNode }) => {
  const [configs, setConfigs] = useState<Record<string, string>>({});

  // sign user
  const [user, setUser] = useState<User | null>(null);
  const [guestCredits, setGuestCredits] = useState<number | null>(null);
  const userRef = useRef<User | null>(null);
  const oneTapAutoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guestTaskClaimInFlightRef = useRef<Promise<GuestTaskClaimResult | null> | null>(null);
  const guestTaskClaimedUserIdRef = useRef<string | null>(null);

  // is check sign (true during SSR and initial render to avoid hydration mismatch when auth is enabled)
  const [isCheckSign, setIsCheckSign] = useState(!!envConfigs.auth_secret);

  // show sign modal
  const [isShowSignModal, setIsShowSignModal] = useState(false);

  // show payment modal
  const [isShowPaymentModal, setIsShowPaymentModal] = useState(false);

  const fetchConfigs = useCallback(async () => {
    try {
      const resp = await fetch('/api/config/get-configs', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setConfigs(data);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('fetch configs failed:', e);
      }
    }
  }, []);

  const fetchUserCredits = useCallback(async () => {
    try {
      if (!userRef.current) {
        return;
      }

      const resp = await fetch('/api/user/get-user-credits', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser((prev) => (prev ? { ...prev, credits: data } : prev));
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('fetch user credits failed:', e);
      }
    }
  }, []);

  const fetchGuestCredits = useCallback(async () => {
    try {
      if (userRef.current) {
        setGuestCredits(null);
        return null;
      }

      const resp = await fetch('/api/guest/trial-credits', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0 || !data) {
        throw new Error(message || 'get guest trial credits failed');
      }

      const remaining = Number.parseInt(String(data.remainingCredits), 10);
      setGuestCredits(Number.isFinite(remaining) ? remaining : 0);
      return data;
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('fetch guest credits failed:', e);
      }
      return null;
    }
  }, []);

  const fetchUserInfo = useCallback(async () => {
    try {
      const resp = await fetch('/api/user/get-user-info', {
        method: 'POST',
      });
      if (!resp.ok) {
        throw new Error(`fetch failed with status: ${resp.status}`);
      }
      const { code, message, data } = await resp.json();
      if (code !== 0) {
        throw new Error(message);
      }

      setUser(data);
      setGuestCredits(null);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('fetch user info failed:', e);
      }
    }
  }, []);

  const claimGuestTasks = useCallback(async () => {
    const activeUserId = userRef.current?.id?.trim() || '';
    if (!activeUserId) {
      return null;
    }

    if (guestTaskClaimedUserIdRef.current === activeUserId) {
      return {
        claimedCount: 0,
        taskIds: [],
      };
    }

    if (guestTaskClaimInFlightRef.current) {
      return guestTaskClaimInFlightRef.current;
    }

    guestTaskClaimInFlightRef.current = (async () => {
      try {
        const resp = await fetch('/api/guest/claim-tasks', {
          method: 'POST',
        });
        if (!resp.ok) {
          throw new Error(`fetch failed with status: ${resp.status}`);
        }

        const { code, message, data } = await resp.json();
        if (code !== 0 || !data) {
          throw new Error(message || 'claim guest tasks failed');
        }

        const claimedCount = Math.max(
          0,
          Number.parseInt(String(data.claimedCount), 10) || 0
        );
        const taskIds = Array.isArray(data.taskIds)
          ? data.taskIds.filter(
              (value: unknown): value is string => typeof value === 'string'
            )
          : [];

        if ((userRef.current?.id?.trim() || '') === activeUserId) {
          guestTaskClaimedUserIdRef.current = activeUserId;
        }

        if (claimedCount > 0) {
          dispatchGuestTaskClaimRefresh();
        }

        return {
          claimedCount,
          taskIds,
        };
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('claim guest tasks failed:', e);
        }
        return null;
      } finally {
        guestTaskClaimInFlightRef.current = null;
      }
    })();

    return guestTaskClaimInFlightRef.current;
  }, []);

  const showOneTap = useCallback(async (configs: Record<string, string>) => {
    try {
      if (typeof window === 'undefined') return;
      if (userRef.current || isShowSignModal) return;

      const pathname = window.location.pathname || '/';
      if (!isOneTapAutoPromptPath(pathname)) return;

      const now = Date.now();
      const state = readOneTapAutoPromptState(now);
      if (state.count >= ONE_TAP_AUTO_PROMPT_LIMIT) return;

      if (oneTapAutoTimerRef.current) {
        clearTimeout(oneTapAutoTimerRef.current);
      }

      oneTapAutoTimerRef.current = setTimeout(async () => {
        if (userRef.current || isShowSignModal) return;
        if (!isOneTapAutoPromptPath(window.location.pathname || '/')) return;

        writeOneTapAutoPromptState({
          windowStartAt: state.windowStartAt,
          count: state.count + 1,
        });

        const callbackURL = `${window.location.pathname}${window.location.search}${window.location.hash}` || '/';
        const authClient = getAuthClient(configs);
        markPendingAffonsoSignup();
        await authClient.oneTap({
          callbackURL,
          onPromptNotification: (notification: any) => {
            // Handle prompt dismissal silently
            // This callback is triggered when the prompt is dismissed or skipped
            if (process.env.NODE_ENV !== 'production') {
              console.log('One Tap prompt notification:', notification);
            }
          },
          // fetchOptions: {
          //   onSuccess: () => {
          //     router.push('/');
          //   },
          // },
        });
      }, ONE_TAP_AUTO_PROMPT_DELAY_MS);
    } catch (error) {
      // Silently handle One Tap cancellation errors
      // These errors occur when users close the prompt or decline to sign in
      // Common errors: FedCM NetworkError, AbortError, etc.
    }
  }, [isShowSignModal]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    if (!user?.id) {
      guestTaskClaimedUserIdRef.current = null;
      return;
    }

    void claimGuestTasks();
  }, [claimGuestTasks, user?.id]);

  useEffect(() => {
    return () => {
      if (oneTapAutoTimerRef.current) {
        clearTimeout(oneTapAutoTimerRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      guestCredits,
      isCheckSign,
      setIsCheckSign,
      isShowSignModal,
      setIsShowSignModal,
      isShowPaymentModal,
      setIsShowPaymentModal,
      configs,
      fetchConfigs,
      fetchUserCredits,
      fetchGuestCredits,
      claimGuestTasks,
      fetchUserInfo,
      showOneTap,
    }),
    [
      user,
      guestCredits,
      isCheckSign,
      isShowSignModal,
      isShowPaymentModal,
      configs,
      fetchConfigs,
      fetchUserCredits,
      fetchGuestCredits,
      claimGuestTasks,
      fetchUserInfo,
      showOneTap,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
