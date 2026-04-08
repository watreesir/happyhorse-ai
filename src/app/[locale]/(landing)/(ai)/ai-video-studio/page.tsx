import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getMetadata } from '@/shared/lib/seo';

import { StudioShell } from './_components/studio-shell';
import { StudioCopy } from './_lib/types';

export const revalidate = 3600;

export const generateMetadata = getMetadata({
  metadataKey: 'ai.video-studio.metadata',
  canonicalUrl: '/ai-video-studio',
  noIndex: true,
});

export default async function AiVideoStudioPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('ai');
  const copy = t.raw('video-studio') as StudioCopy;

  return <StudioShell copy={copy} />;
}
