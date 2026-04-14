'use client';

import { useEffect, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';

import { Link, usePathname } from '@/core/i18n/navigation';
import {
  BrandLogo,
  LocaleSelector,
  SignUser,
  SmartIcon,
  ThemeToggler,
} from '@/shared/blocks/common';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger as RawNavigationMenuTrigger,
} from '@/shared/components/ui/navigation-menu';
import { useMedia } from '@/shared/hooks/use-media';
import { cn } from '@/shared/lib/utils';
import { NavItem } from '@/shared/types/blocks/common';
import { Header as HeaderType } from '@/shared/types/blocks/landing';

// For Next.js hydration mismatch warning, conditionally render NavigationMenuTrigger only after mount to avoid inconsistency between server/client render
function NavigationMenuTrigger(
  props: React.ComponentProps<typeof RawNavigationMenuTrigger>
) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  // Only render after client has mounted, to avoid SSR/client render id mismatch
  if (!mounted) return null;
  return <RawNavigationMenuTrigger {...props} />;
}

export function Header({ header }: { header: HeaderType }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isScrolledRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const isLarge = useMedia('(min-width: 64rem)');
  const pathname = usePathname();
  const isOverlayHeader = !isScrolled && !isMobileMenuOpen;

  const isPathActive = (url?: string) => {
    if (!url) return false;
    return pathname === url || pathname.startsWith(`${url}/`);
  };

  const isNavItemActive = (item: NavItem) =>
    Boolean(
      item.is_active ||
        isPathActive(item.url) ||
        item.children?.some((subItem) => isPathActive(subItem.url))
    );

  const desktopNavItemClass = cn(
    'inline-flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 py-0 text-[0.95rem] font-medium whitespace-nowrap tracking-[0.03em] transition-all duration-200',
    isOverlayHeader
      ? 'text-foreground/88 hover:bg-foreground/7 hover:text-foreground dark:text-white/88 dark:hover:bg-black/28 dark:hover:text-white dark:[text-shadow:0_1px_14px_rgba(0,0,0,0.45)]'
      : 'text-foreground/82 hover:bg-foreground/6 hover:text-foreground'
  );

  const desktopNavActiveClass = isOverlayHeader
    ? 'bg-foreground/7 text-foreground ring-1 ring-foreground/10 dark:bg-black/34 dark:text-white dark:ring-white/12'
    : 'bg-foreground/7 text-foreground ring-1 ring-foreground/8';

  const utilityButtonClass = cn(
    'inline-flex size-9 items-center justify-center rounded-full transition-all duration-200',
    isOverlayHeader
      ? 'text-foreground/82 hover:bg-foreground/7 hover:text-foreground dark:text-white/82 dark:hover:bg-black/28 dark:hover:text-white dark:[text-shadow:0_1px_12px_rgba(0,0,0,0.45)]'
      : 'text-foreground/80 hover:bg-foreground/6 hover:text-foreground'
  );

  const desktopNavIconClass = cn(
    'size-4 shrink-0',
    isOverlayHeader
      ? 'text-foreground/70 dark:text-white/78'
      : 'text-foreground/70'
  );

  const brand = header.brand
    ? {
        ...header.brand,
        className: cn(
          'group rounded-full px-2.5 py-1.5 transition-all duration-200',
          isOverlayHeader
            ? 'text-foreground dark:text-white dark:[text-shadow:0_1px_14px_rgba(0,0,0,0.45)]'
            : 'text-foreground',
          '[&_img]:rounded-xl [&_img]:shadow-[0_10px_28px_rgba(0,0,0,0.22)]',
          '[&_span]:text-[1.08rem] [&_span]:font-semibold [&_span]:tracking-[0.08em]',
          header.brand.className
        ),
      }
    : null;

  useEffect(() => {
    // Listen to scroll event to enable header styles on scroll
    const handleScroll = () => {
      // Coalesce high-frequency scroll events & only update state when value changes.
      if (scrollRafRef.current != null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const next = window.scrollY > 50;
        if (next === isScrolledRef.current) return;
        isScrolledRef.current = next;
        setIsScrolled(next);
      });
    };

    // Initialize once on mount.
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollRafRef.current != null) {
        window.cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
    };
  }, []);

  // Navigation menu for large screens
  const NavMenu = () => {
    return (
      <NavigationMenu
        viewport={false}
        className="**:data-[slot=navigation-menu-content]:top-10 max-lg:hidden"
      >
        <NavigationMenuList className="gap-2">
          {header.nav?.items?.map((item, idx) => {
            const isActive = isNavItemActive(item);

            if (!item.children || item.children.length === 0) {
              return (
                <NavigationMenuItem key={idx}>
                  <Link
                    href={item.url || ''}
                    target={item.target || '_self'}
                    className={cn(
                      desktopNavItemClass,
                      isActive && desktopNavActiveClass
                    )}
                  >
                    {item.icon && (
                      <SmartIcon
                        name={item.icon as string}
                        className={desktopNavIconClass}
                      />
                    )}
                    <span>{item.title}</span>
                  </Link>
                </NavigationMenuItem>
              );
            }

            return (
              <NavigationMenuItem key={idx}>
                <NavigationMenuTrigger
                  onPointerDownCapture={(event) => {
                    if (event.pointerType === 'mouse') {
                      event.preventDefault();
                    }
                  }}
                  onClickCapture={(event) => {
                    event.preventDefault();
                  }}
                  className={cn(
                    '!h-10 !shrink-0 !rounded-full !px-3.5 !py-0 !shadow-none',
                    '!whitespace-nowrap',
                    '!text-[0.95rem] !font-medium !tracking-[0.03em]',
                    isOverlayHeader
                      ? '!text-foreground/88 hover:!bg-foreground/7 hover:!text-foreground data-[state=open]:!bg-foreground/7 data-[state=open]:!text-foreground data-[state=open]:ring-foreground/10 !bg-transparent data-[state=open]:ring-1 dark:!text-white/88 dark:[text-shadow:0_1px_14px_rgba(0,0,0,0.45)] dark:hover:!bg-black/28 dark:hover:!text-white dark:data-[state=open]:!bg-black/34 dark:data-[state=open]:!text-white dark:data-[state=open]:ring-white/12'
                      : '!text-foreground/82 hover:!bg-foreground/6 hover:!text-foreground data-[state=open]:!bg-foreground/7 data-[state=open]:!text-foreground data-[state=open]:ring-foreground/8 !bg-transparent data-[state=open]:ring-1',
                    isActive && desktopNavActiveClass
                  )}
                >
                  {item.icon && (
                    <SmartIcon
                      name={item.icon as string}
                      className={desktopNavIconClass}
                    />
                  )}
                  <span>{item.title}</span>
                </NavigationMenuTrigger>
                <NavigationMenuContent className="min-w-2xs origin-top p-0.5">
                  <div className="rounded-[22px] border border-black/8 bg-white/92 p-2 text-slate-950 shadow-[0_22px_60px_rgba(15,23,42,0.18)] ring-1 ring-black/6 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/92 dark:text-white dark:ring-white/8">
                    <ul className="mt-1 space-y-2">
                      {item.children?.map((subItem: NavItem, index: number) => (
                        <ListItem
                          key={index}
                          href={subItem.url || ''}
                          target={subItem.target || '_self'}
                          title={subItem.title || ''}
                          description={subItem.description || ''}
                        >
                          {subItem.icon && (
                            <SmartIcon name={subItem.icon as string} />
                          )}
                        </ListItem>
                      ))}
                    </ul>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            );
          })}
        </NavigationMenuList>
      </NavigationMenu>
    );
  };

  // Mobile menu using Accordion, shown on small screens
  const MobileMenu = ({ closeMenu }: { closeMenu: () => void }) => {
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] w-full flex-col [--color-border:--alpha(var(--color-foreground)/5%)] [--color-muted:--alpha(var(--color-foreground)/5%)]">
        <nav role="navigation" className="w-full flex-1 overflow-y-auto">
          <Accordion
            type="single"
            collapsible
            className="-mx-4 mt-0.5 space-y-0.5 **:hover:no-underline"
          >
            {header.nav?.items?.map((item, idx) => {
              return (
                <AccordionItem
                  key={idx}
                  value={item.title || ''}
                  className="group relative border-b-0 before:pointer-events-none before:absolute before:inset-x-4 before:bottom-0 before:border-b"
                >
                  {item.children && item.children.length > 0 ? (
                    <>
                      <AccordionTrigger className="data-[state=open]:bg-muted flex items-center justify-between px-4 py-3 text-lg **:!font-normal">
                        {item.title}
                      </AccordionTrigger>
                      <AccordionContent className="pb-5">
                        <ul>
                          {item.children?.map((subItem: NavItem, iidx) => (
                            <li key={iidx}>
                              <Link
                                href={subItem.url || ''}
                                onClick={closeMenu}
                                className="text-foreground/88 grid grid-cols-[auto_1fr] items-center gap-2.5 px-4 py-2 text-base font-medium tracking-[0.02em]"
                              >
                                <div
                                  aria-hidden
                                  className="flex items-center justify-center *:size-4"
                                >
                                  {subItem.icon && (
                                    <SmartIcon name={subItem.icon as string} />
                                  )}
                                </div>
                                <div className="text-base">{subItem.title}</div>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </>
                  ) : (
                    <Link
                      href={item.url || ''}
                      onClick={closeMenu}
                      className="data-[state=open]:bg-muted text-foreground/88 flex items-center justify-between px-4 py-3 text-lg font-medium tracking-[0.02em] **:!font-normal"
                    >
                      {item.title}
                    </Link>
                  )}
                </AccordionItem>
              );
            })}
          </Accordion>
        </nav>

        <div className="mt-auto border-t border-foreground/8 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-5">
          {header.buttons && header.buttons.length > 0 ? (
            <div className="mb-4 flex flex-col gap-3">
              {header.buttons.map((button, idx) => (
                <Link
                  key={idx}
                  href={button.url || ''}
                  target={button.target || '_self'}
                  onClick={closeMenu}
                  className={cn(
                    'focus-visible:ring-ring inline-flex h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                    button.variant === 'outline'
                      ? 'bg-background border-primary ring-foreground/10 hover:bg-muted/50 dark:ring-foreground/15 dark:hover:bg-muted/50 border border-transparent shadow-sm ring-1 shadow-black/15 duration-200'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 border-[0.5px] border-white/25 shadow-md ring-1 shadow-black/20 ring-(--ring-color) [--ring-color:color-mix(in_oklab,var(--color-foreground)15%,var(--color-primary))]'
                  )}
                >
                  {button.icon && (
                    <SmartIcon
                      name={button.icon as string}
                      className="size-4"
                    />
                  )}
                  <span>{button.title}</span>
                </Link>
              ))}
            </div>
          ) : null}

          <div className="mb-4 flex items-center gap-4">
            {header.show_theme ? (
              <ThemeToggler className={utilityButtonClass} />
            ) : null}
            {header.show_locale ? (
              <LocaleSelector className={utilityButtonClass} />
            ) : null}
          </div>

          {header.show_sign ? (
            <SignUser
              userNav={header.user_nav}
              variant="mobile-menu-auth"
              mobileMenuOpen={isMobileMenuOpen}
            />
          ) : null}
        </div>
      </div>
    );
  };

  // List item for submenus in NavigationMenu
  function ListItem({
    title,
    description,
    children,
    href,
    target,
    ...props
  }: React.ComponentPropsWithoutRef<'li'> & {
    href: string;
    title: string;
    description?: string;
    target?: string;
  }) {
    return (
      <li {...props}>
        <NavigationMenuLink asChild>
          <Link
            href={href}
            target={target || '_self'}
            className="grid grid-cols-[auto_1fr] gap-3.5 rounded-2xl px-2 py-2 transition-colors hover:bg-black/4 dark:hover:bg-white/6"
          >
            <div className="relative flex size-10 items-center justify-center rounded-2xl border border-black/8 bg-black/[0.03] text-slate-700 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/78 dark:ring-white/8">
              {children}
            </div>
            <div className="space-y-0.5">
              <div className="text-sm font-semibold tracking-[0.02em] text-slate-800 dark:text-white">
                {title}
              </div>
              <p className="line-clamp-1 text-xs text-slate-500 dark:text-white/55">
                {description}
              </p>
            </div>
          </Link>
        </NavigationMenuLink>
      </li>
    );
  }

  return (
    <>
      <header
        data-state={isMobileMenuOpen ? 'active' : 'inactive'}
        {...(isScrolled && { 'data-scrolled': true })}
        className="fixed inset-x-0 top-0 z-50"
      >
        <div
          className={cn(
            'border-foreground/10 bg-background/72 ring-foreground/6 absolute inset-x-0 top-0 z-50 h-18 border-b shadow-[0_16px_40px_rgba(15,23,42,0.08)] ring-1 backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-black/24 dark:shadow-[0_16px_40px_rgba(0,0,0,0.14)] dark:ring-white/6',
            'in-data-scrolled:border-foreground/8 in-data-scrolled:bg-background/86 in-data-scrolled:ring-foreground/8 in-data-scrolled:backdrop-blur-xl',
            'max-lg:in-data-[state=active]:bg-background/75 max-lg:h-14 max-lg:overflow-hidden max-lg:border-b max-lg:in-data-[state=active]:h-screen max-lg:in-data-[state=active]:backdrop-blur'
          )}
        >
          <div className="container">
            <div className="relative flex flex-wrap items-center justify-between lg:flex-nowrap lg:py-5">
              <div className="flex items-center justify-between gap-8 max-lg:h-14 max-lg:w-full max-lg:border-b lg:min-w-0 lg:flex-1">
                {/* Brand Logo */}
                {brand && <BrandLogo brand={brand} />}

                {/* Desktop Navigation Menu */}
                {isLarge && <NavMenu />}
                <div className="flex items-center gap-2 lg:hidden">
                  {header.show_sign ? (
                    <SignUser
                      userNav={header.user_nav}
                      variant="compact-credits"
                    />
                  ) : null}

                  {/* Hamburger menu button for mobile navigation */}
                  <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    aria-label={
                      isMobileMenuOpen == true ? 'Close Menu' : 'Open Menu'
                    }
                    className="relative z-20 -m-2.5 -mr-3 block cursor-pointer p-2.5"
                  >
                    <Menu
                      className={cn(
                        'm-auto size-5 duration-200 in-data-[state=active]:scale-0 in-data-[state=active]:rotate-180 in-data-[state=active]:opacity-0',
                        isOverlayHeader
                          ? 'text-foreground/88 dark:text-white/88'
                          : 'text-foreground/82'
                      )}
                    />
                    <X
                      className={cn(
                        'absolute inset-0 m-auto size-5 scale-0 -rotate-180 opacity-0 duration-200 in-data-[state=active]:scale-100 in-data-[state=active]:rotate-0 in-data-[state=active]:opacity-100',
                        isOverlayHeader
                          ? 'text-foreground/88 dark:text-white/88'
                          : 'text-foreground/82'
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Show mobile menu if needed */}
              {!isLarge && isMobileMenuOpen && (
                <MobileMenu closeMenu={() => setIsMobileMenuOpen(false)} />
              )}

              {/* Header right section: theme toggler, locale selector, sign, buttons */}
              <div className="mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 md:flex-nowrap lg:ml-6 lg:m-0 lg:flex lg:w-auto lg:flex-none lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                <div className="flex w-full flex-row items-center gap-4 sm:flex-row sm:gap-6 sm:space-y-0 lg:w-auto">
                  {header.buttons &&
                    header.buttons.map((button, idx) => (
                      <Link
                        key={idx}
                        href={button.url || ''}
                        target={button.target || '_self'}
                        className={cn(
                          'focus-visible:ring-ring inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-1 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                          'h-7 px-3 ring-0',
                          button.variant === 'outline'
                            ? 'bg-background border-primary ring-foreground/10 hover:bg-muted/50 dark:ring-foreground/15 dark:hover:bg-muted/50 border border-transparent shadow-sm ring-1 shadow-black/15 duration-200'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90 border-[0.5px] border-white/25 shadow-md ring-1 shadow-black/20 ring-(--ring-color) [--ring-color:color-mix(in_oklab,var(--color-foreground)15%,var(--color-primary))]'
                        )}
                      >
                        {button.icon && (
                          <SmartIcon
                            name={button.icon as string}
                            className="size-4"
                          />
                        )}
                        <span>{button.title}</span>
                      </Link>
                    ))}

                  {header.show_theme ? (
                    <ThemeToggler className={utilityButtonClass} />
                  ) : null}
                  {header.show_locale ? (
                    <LocaleSelector className={utilityButtonClass} />
                  ) : null}
                  {header.show_sign ? (
                    <SignUser userNav={header.user_nav} />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
