'use client';

import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';

type AccessDeniedProps = {
  fallbackHref?: string | null;
};

export default function AccessDenied({
  fallbackHref = '/dashboard',
}: AccessDeniedProps) {
  const t = useTranslations('forbidden');
  const router = useRouter();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-red-600">
          <ShieldX size={40} />
        </div>

        <div className="mb-8">
          <h1 className="text-5xl font-bold text-red-500">403</h1>
          <h2 className="text-3xl font-semibold text-gray-800 mt-4">
            {t('title')}
          </h2>
          <p className="text-gray-600 mt-4">{t('message')}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
            {t('goBack')}
          </button>
          {fallbackHref && (
            <button
              onClick={() => router.push(fallbackHref)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-sky-400 hover:bg-sky-500 text-white rounded-lg transition-colors"
            >
              <Home size={20} />
              {t('goToAllowedPage')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
