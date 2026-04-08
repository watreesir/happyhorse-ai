import { envConfigs } from '@/config';
import { defaultLocale } from '@/config/locale';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return {
    title: 'Access denied',
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical:
        locale !== defaultLocale
          ? `${envConfigs.app_url}/${locale}/no-permission`
          : `${envConfigs.app_url}/no-permission`,
    },
  };
}

export default function NoPermissionPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center">
      <h1 className="text-2xl font-normal">Access denied</h1>
    </div>
  );
}
