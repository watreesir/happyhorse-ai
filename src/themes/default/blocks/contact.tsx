'use client';

import { Fragment } from 'react';

import { Link } from '@/core/i18n/navigation';
import { cn } from '@/shared/lib/utils';
import { Section } from '@/shared/types/blocks/landing';

// ---------------------------------------------------------------------------
// Types matching the JSON config shape
// ---------------------------------------------------------------------------

interface ContactCard {
  id: string;
  title: string;
  description: string;
  span: 'full' | 'half';
}

interface ContactResources {
  title: string;
  items: string[];
}

interface ContactResponseTimes {
  title: string;
  items: string[];
  note?: string;
}

// ---------------------------------------------------------------------------
// Inline link parser
// Converts "[link text](url)" patterns in a string into clickable elements.
// Handles mailto:, internal paths, and external URLs.
// ---------------------------------------------------------------------------

function parseInlineLinks(text: string): React.ReactNode {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <Fragment>
      {parts.map((part, i) => {
        const match = part.match(/^\[(.+?)\]\((.+?)\)$/);
        if (!match) return <Fragment key={i}>{part}</Fragment>;

        const [, linkText, href] = match;
        const linkClass =
          'text-primary underline underline-offset-4 hover:no-underline';

        if (href.startsWith('mailto:') || href.startsWith('http')) {
          return (
            <a key={i} href={href} className={linkClass}>
              {linkText}
            </a>
          );
        }

        return (
          <Link key={i} href={href} className={linkClass}>
            {linkText}
          </Link>
        );
      })}
    </Fragment>
  );
}

// ---------------------------------------------------------------------------
// Card component
// ---------------------------------------------------------------------------

function ContactCardBlock({ card }: { card: ContactCard }) {
  return (
    <div className="rounded-lg border bg-card p-6 md:p-8">
      <h2 className="text-foreground mb-3 text-lg font-semibold">{card.title}</h2>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {parseInlineLinks(card.description)}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Contact block
// ---------------------------------------------------------------------------

export function Contact({
  section,
  className,
}: {
  section: Section;
  className?: string;
}) {
  const cards: ContactCard[] = section.cards ?? [];
  const resources: ContactResources = section.resources ?? {
    title: '',
    items: [],
  };
  const responseTimes: ContactResponseTimes = section.response_times ?? {
    title: '',
    items: [],
  };

  // Group consecutive half cards into 2-column rows; full cards stay solo
  const renderCards = () => {
    const rows: React.ReactNode[] = [];
    let i = 0;

    while (i < cards.length) {
      const card = cards[i];

      if (card.span === 'full') {
        rows.push(<ContactCardBlock key={card.id} card={card} />);
        i++;
      } else {
        // Collect a run of half-span cards
        const halfRun: ContactCard[] = [];
        while (i < cards.length && cards[i].span === 'half') {
          halfRun.push(cards[i]);
          i++;
        }
        rows.push(
          <div key={`half-row-${i}`} className="grid gap-4 md:grid-cols-2">
            {halfRun.map((hc) => (
              <ContactCardBlock key={hc.id} card={hc} />
            ))}
          </div>
        );
      }
    }

    return rows;
  };

  return (
    <section
      id={section.id}
      className={cn('py-16 md:py-24', section.className, className)}
    >
      <div className="container max-w-3xl space-y-4">
        {/* Page header card */}
        <div className="rounded-lg border bg-card p-6 md:p-8">
          <h1 className="text-foreground mb-3 text-2xl font-bold md:text-3xl">
            {section.page_title}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {section.page_description}
          </p>
        </div>

        {/* Support cards (full-width and 2-column rows) */}
        {renderCards()}

        {/* Self-Service Resources */}
        {resources.items.length > 0 && (
          <div className="rounded-lg border bg-card p-6 md:p-8">
            <h2 className="text-foreground mb-4 text-lg font-semibold">
              {resources.title}
            </h2>
            <ul className="space-y-2">
              {resources.items.map((item, idx) => (
                <li
                  key={idx}
                  className="text-muted-foreground flex gap-2 text-sm"
                >
                  <span className="mt-0.5 shrink-0 select-none">•</span>
                  <span>{parseInlineLinks(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Typical Response Times */}
        {responseTimes.items.length > 0 && (
          <div className="rounded-lg border bg-card p-6 md:p-8">
            <h2 className="text-foreground mb-4 text-lg font-semibold">
              {responseTimes.title}
            </h2>
            <ul className="mb-4 space-y-1">
              {responseTimes.items.map((item, idx) => (
                <li
                  key={idx}
                  className="text-muted-foreground flex gap-2 text-sm"
                >
                  <span className="shrink-0 select-none">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            {responseTimes.note && (
              <p className="text-muted-foreground text-sm leading-relaxed">
                {responseTimes.note}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
