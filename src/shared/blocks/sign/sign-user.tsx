'use client';

import { useEffect, useRef, useState } from 'react';
import { Fragment } from 'react/jsx-runtime';
import {
  BellRing,
  Coins,
  LayoutDashboard,
  Loader2,
  LogOut,
  User,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { authClient, signIn, signOut, useSession } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useAppContext } from '@/shared/contexts/app';
import {
  clearPendingAffonsoSignup,
  hasRecentPendingAffonsoSignup,
  markPendingAffonsoSignup,
  reportAffonsoSignup,
} from '@/shared/lib/affiliate-client';
import { cn } from '@/shared/lib/utils';
import { User as UserType } from '@/shared/models/user';
import { NavItem, UserNav } from '@/shared/types/blocks/common';

import { SmartIcon } from '../common/smart-icon';
import { SignModal } from './sign-modal';

function extractSessionUser(data: any): UserType | null {
  const u = data?.user ?? data?.data?.user ?? null;
  return u && typeof u === 'object' ? (u as UserType) : null;
}

export function SignUser({
  isScrolled,
  signButtonSize = 'sm',
  userNav,
  variant = 'default',
  mobileMenuOpen = false,
}: {
  isScrolled?: boolean;
  signButtonSize?: 'default' | 'sm' | 'lg' | 'icon';
  userNav?: UserNav;
  variant?: 'default' | 'compact-credits' | 'mobile-menu-auth';
  mobileMenuOpen?: boolean;
}) {
  const t = useTranslations('common.sign');
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // get app context values
  const {
    configs,
    fetchConfigs,
    fetchUserCredits,
    fetchGuestCredits,
    isCheckSign,
    setIsCheckSign,
    user,
    setUser,
    guestCredits,
    fetchUserInfo,
    showOneTap,
  } = useAppContext();

  // get session
  const { data: session, isPending } = useSession();
  const sessionUser = extractSessionUser(session);
  const displayUser = (user as UserType | null) ?? sessionUser;

  // In dev (React StrictMode) effects can run twice; ensure we don't spam getSession().
  const didFallbackSyncRef = useRef(false);

  // one tap initialized
  const oneTapInitialized = useRef(false);
  const dailyCreditsCheckedRef = useRef(false);
  const guestCreditsCheckedRef = useRef(false);
  const authTransitionInitializedRef = useRef(false);
  const affiliateSignupCheckedRef = useRef(false);
  const wasSignedInRef = useRef(false);
  const hadGuestStateRef = useRef(false);
  const mobileMenuPromptAttemptedRef = useRef(false);

  const isCompactCredits = variant === 'compact-credits';
  const isMobileMenuAuth = variant === 'mobile-menu-auth';
  const shouldRenderCredits = Boolean(userNav?.show_credits);

  const creditsBadgeClassName = cn(
    'inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold',
    'border-emerald-200/80 bg-emerald-50/90 text-emerald-700',
    'dark:border-emerald-400/30 dark:bg-emerald-500/12 dark:text-emerald-200'
  );

  useEffect(() => {
    fetchConfigs();
  }, []);

  // set is check sign
  useEffect(() => {
    setIsCheckSign(isPending);
  }, [isPending]);

  // show one tap if not initialized
  useEffect(() => {
    if (isCompactCredits || isMobileMenuAuth) {
      return;
    }

    if (
      configs &&
      configs.google_client_id &&
      configs.google_one_tap_enabled === 'true' &&
      !session &&
      !isPending &&
      !oneTapInitialized.current
    ) {
      oneTapInitialized.current = true;
      showOneTap(configs);
    }
  }, [configs, isCompactCredits, isMobileMenuAuth, session, isPending, showOneTap]);

  useEffect(() => {
    if (!isMobileMenuAuth) {
      return;
    }

    if (!mobileMenuOpen) {
      mobileMenuPromptAttemptedRef.current = false;
    }
  }, [isMobileMenuAuth, mobileMenuOpen]);

  useEffect(() => {
    if (!isMobileMenuAuth || !mobileMenuOpen || !mounted || isPending || displayUser?.id) {
      return;
    }

    if (
      !configs ||
      !configs.google_client_id ||
      configs.google_one_tap_enabled !== 'true'
    ) {
      return;
    }

    if (mobileMenuPromptAttemptedRef.current) {
      return;
    }

    mobileMenuPromptAttemptedRef.current = true;

    const timer = window.setTimeout(() => {
      void showOneTap(configs);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [
    configs,
    displayUser?.id,
    isMobileMenuAuth,
    isPending,
    mobileMenuOpen,
    mounted,
    showOneTap,
  ]);

  // set user
  useEffect(() => {
    const currentUserId = user?.id;
    const sessionUserId = (sessionUser as any)?.id;

    if (sessionUser && sessionUserId !== currentUserId) {
      setUser(sessionUser as UserType);
      fetchUserInfo();
    } else if (!sessionUser && currentUserId && !isPending) {
      // Only clear user when session is definitively resolved (not pending).
      // This prevents a race where fetchUserInfo() sets user but useSession
      // hasn't re-fetched yet, which would incorrectly clear the user.
      setUser(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionUser?.id, (sessionUser as any)?.email, user?.id, isPending]);

  // Fallback: if the session cookie is present but useSession lags, do a single refresh.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (didFallbackSyncRef.current) return;
    // Only run when useSession is done but still no user.
    if (isPending) return;
    if (sessionUser || user) return;

    didFallbackSyncRef.current = true;
    void (async () => {
      try {
        const res: any = await authClient.getSession();
        const fresh = extractSessionUser(res?.data ?? res);
        if (fresh?.id) {
          setUser(fresh);
          fetchUserInfo();
        }
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, sessionUser, user?.id]);

  useEffect(() => {
    if (!mounted || isPending || !displayUser?.id) {
      return;
    }

    if (dailyCreditsCheckedRef.current) {
      return;
    }

    dailyCreditsCheckedRef.current = true;

    void (async () => {
      const maxAttempts = 3;
      try {
        let payload: any = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          const resp = await fetch('/api/user/claim-daily-credits', {
            method: 'POST',
          });

          if (resp.ok) {
            const { code, message, data } = await resp.json();
            if (code === 0 && data) {
              payload = data;
              break;
            }

            throw new Error(message || 'claim daily credits failed');
          }

          if (attempt >= maxAttempts) {
            throw new Error(`fetch failed with status: ${resp.status}`);
          }

          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        }

        if (!payload) {
          throw new Error('claim daily credits failed');
        }

        if (payload.claimed) {
          await fetchUserCredits();
          toast.success(
            t('daily_credits_claimed', {
              credits: payload.credits,
            }),
            { position: 'bottom-right' }
          );
          return;
        }

        if (payload.alreadyClaimed && payload.eligible) {
          toast.message(
            t('daily_credits_already_claimed', {
              credits: payload.credits,
            }),
            { position: 'bottom-right' }
          );
        }
      } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('claim daily credits failed:', e);
        }
      }
    })();
  }, [displayUser?.id, fetchUserCredits, isPending, mounted, t]);

  useEffect(() => {
    if (!mounted || isPending || displayUser?.id) {
      return;
    }

    if (guestCreditsCheckedRef.current) {
      return;
    }

    guestCreditsCheckedRef.current = true;

    void (async () => {
      const result = await fetchGuestCredits();
      if (!result) {
        return;
      }

      hadGuestStateRef.current = true;

      if (result.claimedDaily) {
        toast.success(
          t('guest_daily_credits_claimed', {
            credits: result.totalCredits,
          }),
          { position: 'bottom-right' }
        );
      }
    })();
  }, [displayUser?.id, fetchGuestCredits, isPending, mounted, t]);

  useEffect(() => {
    if (!displayUser?.id && guestCredits !== null) {
      hadGuestStateRef.current = true;
    }
  }, [displayUser?.id, guestCredits]);

  useEffect(() => {
    if (!displayUser?.id) {
      affiliateSignupCheckedRef.current = false;
    }
  }, [displayUser?.id]);

  useEffect(() => {
    if (!mounted || isPending || !displayUser?.id) {
      return;
    }

    if (affiliateSignupCheckedRef.current) {
      return;
    }

    if (typeof configs.affonso_enabled === 'undefined') {
      return;
    }

    affiliateSignupCheckedRef.current = true;

    if (!hasRecentPendingAffonsoSignup()) {
      return;
    }

    const createdAt = displayUser.createdAt
      ? new Date(displayUser.createdAt)
      : null;
    const isLikelyFreshAccount =
      createdAt instanceof Date &&
      Number.isFinite(createdAt.getTime()) &&
      Date.now() - createdAt.getTime() < 10 * 60 * 1000;

    if (!isLikelyFreshAccount || configs.affonso_enabled !== 'true') {
      clearPendingAffonsoSignup();
      return;
    }

    let cancelled = false;

    void (async () => {
      for (let attempt = 0; attempt < 10 && !cancelled; attempt += 1) {
        const reported = reportAffonsoSignup({
          configs,
          email: displayUser.email,
          externalUserId: displayUser.id,
          name: displayUser.name,
        });

        if (reported) {
          clearPendingAffonsoSignup();
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    configs,
    displayUser?.createdAt,
    displayUser?.email,
    displayUser?.id,
    displayUser?.name,
    isPending,
    mounted,
  ]);

  useEffect(() => {
    if (!mounted || isPending) {
      return;
    }

    const signedIn = Boolean(displayUser?.id);
    if (!authTransitionInitializedRef.current) {
      authTransitionInitializedRef.current = true;
      wasSignedInRef.current = signedIn;
      return;
    }

    if (!wasSignedInRef.current && signedIn && hadGuestStateRef.current) {
      const createdAt = displayUser?.createdAt
        ? new Date(displayUser.createdAt)
        : null;
      const isLikelyFreshAccount =
        createdAt instanceof Date &&
        Number.isFinite(createdAt.getTime()) &&
        Date.now() - createdAt.getTime() < 10 * 60 * 1000;

      if (isLikelyFreshAccount) {
        const rewardCredits =
          Number.parseInt(String(configs.initial_credits_amount ?? ''), 10) ||
          65;
        toast.success(
          t('guest_login_reward', {
            credits: rewardCredits,
          }),
          { position: 'bottom-right' }
        );
      }
      hadGuestStateRef.current = false;
    }

    wasSignedInRef.current = signedIn;

    if (!signedIn) {
      dailyCreditsCheckedRef.current = false;
      guestCreditsCheckedRef.current = false;
    }
  }, [configs.initial_credits_amount, displayUser?.createdAt, displayUser?.id, isPending, mounted, t]);

  const handleTopRightSignIn = async () => {
    const callbackURL =
      `${window.location.pathname}${window.location.search}${window.location.hash}` ||
      '/';
    try {
      markPendingAffonsoSignup();
      await signIn.social({
        provider: 'google',
        callbackURL,
      });
      return;
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('header google sign in failed:', error);
      }
    }

    router.push('/sign-in');
  };

  if (isCompactCredits) {
    if (!mounted || isCheckSign || !shouldRenderCredits) {
      return null;
    }

    if (displayUser) {
      return (
        <Link
          href="/settings/credits"
          className={cn(
            creditsBadgeClassName,
            'min-w-[4.5rem] px-3 py-1.5 text-sm'
          )}
        >
          <Coins className="h-3.5 w-3.5" />
          <span className="tabular-nums">
            {displayUser.credits?.remainingCredits ?? 0}
          </span>
        </Link>
      );
    }

    return (
      <span
        className={cn(
          creditsBadgeClassName,
          'min-w-[4.5rem] px-3 py-1.5 text-sm'
        )}
      >
        <Coins className="h-3.5 w-3.5" />
        <span className="tabular-nums">{guestCredits ?? 0}</span>
      </span>
    );
  }

  return (
    <>
      {isCheckSign || !mounted ? (
        <div>
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : displayUser ? (
        <div className="flex items-center gap-2">
          {shouldRenderCredits && (
            <Link
              href="/settings/credits"
              className={creditsBadgeClassName}
            >
              <Coins className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                {displayUser.credits?.remainingCredits ?? 0}
              </span>
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full p-0"
              >
                <Avatar>
                  <AvatarImage
                    src={displayUser.image || ''}
                    alt={displayUser.name || ''}
                  />
                  <AvatarFallback>{displayUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
            {userNav?.show_name && (
              <>
                <DropdownMenuItem asChild>
                  <Link
                    className="w-full cursor-pointer"
                    href="/settings/profile"
                  >
                    <User />
                    {displayUser.name}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {userNav?.show_credits && (
              <>
                <DropdownMenuItem asChild>
                  <Link
                    className="w-full cursor-pointer"
                    href="/settings/credits"
                  >
                    <Coins />
                    {t('credits_title', {
                      credits: displayUser.credits?.remainingCredits || 0,
                    })}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {userNav?.items?.map((item: NavItem, idx: number) => (
              <Fragment key={idx}>
                <DropdownMenuItem asChild>
                  <Link
                    className="w-full cursor-pointer"
                    href={item.url || ''}
                    target={item.target || '_self'}
                  >
                    {item.icon && (
                      <SmartIcon
                        name={item.icon as string}
                        className="h-4 w-4"
                      />
                    )}
                    {item.title}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </Fragment>
            ))}

            {displayUser.isAdmin && (
              <>
                <DropdownMenuItem asChild>
                  <Link className="w-full cursor-pointer" href="/admin">
                    <LayoutDashboard />
                    {t('admin_title')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {userNav?.show_sign_out && (
              <DropdownMenuItem
                className="w-full cursor-pointer"
                onClick={() =>
                  signOut({
                    fetchOptions: {
                      onSuccess: () => {
                        router.push('/');
                      },
                    },
                  })
                }
              >
                <LogOut />
                <span>{t('sign_out_title')}</span>
              </DropdownMenuItem>
            )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div
          className={cn(
            'flex w-full flex-col',
            isMobileMenuAuth
              ? 'gap-4'
              : 'space-y-3 sm:flex-row sm:items-center sm:gap-3 sm:space-y-0 md:w-fit'
          )}
        >
          {shouldRenderCredits && (
            <span
              className={cn(
                creditsBadgeClassName,
                isMobileMenuAuth
                  ? 'min-h-11 w-full justify-center rounded-2xl px-4 py-3 text-sm'
                  : ''
              )}
            >
              <Coins className="h-3.5 w-3.5" />
              <span className="tabular-nums">{guestCredits ?? 0}</span>
            </span>
          )}
          <Button
            size={isMobileMenuAuth ? 'lg' : signButtonSize}
            className={cn(
              'cursor-pointer border-emerald-500/70 bg-emerald-600 text-white shadow-[0_10px_24px_-16px_rgba(5,150,105,0.9)] ring-0 hover:bg-emerald-500',
              'dark:border-emerald-400/60 dark:bg-emerald-500 dark:text-zinc-950 dark:hover:bg-emerald-400',
              isMobileMenuAuth
                ? 'min-h-12 w-full rounded-2xl px-4 text-base font-semibold'
                : 'rounded-full px-3.5',
              isScrolled && !isMobileMenuAuth && 'lg:hidden'
            )}
            onClick={() => void handleTopRightSignIn()}
          >
            <span className="inline-flex items-center gap-1.5">
              <BellRing className={cn('h-3.5 w-3.5', isMobileMenuAuth && 'h-4 w-4')} />
              {isMobileMenuAuth ? (
                <span>{t('video_alerts_guide')}</span>
              ) : (
                <>
                  <span className="hidden lg:inline">{t('video_alerts_guide')}</span>
                  <span className="lg:hidden">{t('video_alerts_guide_short')}</span>
                </>
              )}
            </span>
          </Button>
          <SignModal />
        </div>
      )}
    </>
  );
}
